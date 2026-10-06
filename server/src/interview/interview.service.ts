import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../llm/anthropic.service';
import { CreateInterviewDto } from './dto/interview.dto';
import {
  buildInterviewerSystemPrompt,
  buildEvaluationSystemPrompt,
} from './interview.prompts';

// Synthetic opening "user" turn. The Messages API expects the conversation to
// start with a user message, but the first stored message is the
// interviewer's (assistant) greeting — so every call re-sends this kickoff first.
const KICKOFF_MESSAGE =
  'Begin the interview. Greet the candidate briefly and ask your first question.';

interface InterviewerReply {
  action: 'ask' | 'end';
  message: string;
}

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private ai: AnthropicService,
  ) {}

  private metaOf(s: {
    role: string;
    level: string;
    interviewType: string;
    durationMin: number;
    resumeText: string;
  }) {
    return {
      role: s.role,
      level: s.level,
      interviewType: s.interviewType,
      durationMin: s.durationMin,
      resumeText: s.resumeText,
    };
  }

  // Build the alternating message list for Claude from stored turns.
  private toClaudeMessages(
    messages: { sender: string; content: string }[],
  ): { role: 'user' | 'assistant'; content: string }[] {
    return messages.map((m) => ({
      role: m.sender === 'interviewer' ? 'assistant' : 'user',
      content: m.content,
    }));
  }

  private secondsRemaining(session: {
    startedAt: Date;
    durationMin: number;
  }): number {
    const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
    return Math.max(0, session.durationMin * 60 - Math.floor(elapsed));
  }

  async create(userId: string, dto: CreateInterviewDto) {
    const session = await this.prisma.interviewSession.create({
      data: {
        userId,
        role: dto.role,
        level: dto.level,
        interviewType: dto.interviewType,
        durationMin: dto.durationMin,
        resumeText: dto.resumeText,
      },
    });

    // Ask the AI for the opening question.
    const system = buildInterviewerSystemPrompt(this.metaOf(session));
    const reply = await this.ai.chatJson<InterviewerReply>(system, [
      { role: 'user', content: KICKOFF_MESSAGE },
    ]);

    await this.prisma.interviewMessage.create({
      data: {
        sessionId: session.id,
        sender: 'interviewer',
        content: reply.message,
        order: 0,
      },
    });

    return {
      id: session.id,
      role: session.role,
      level: session.level,
      interviewType: session.interviewType,
      durationMin: session.durationMin,
      status: session.status,
      startedAt: session.startedAt,
      secondsRemaining: this.secondsRemaining(session),
      question: reply.message,
    };
  }

  async answer(userId: string, sessionId: string, answer: string) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { order: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Interview not found');
    if (session.status === 'completed') {
      throw new BadRequestException('This interview has already ended');
    }

    const nextOrder = session.messages.length;
    // Persist the candidate's answer.
    await this.prisma.interviewMessage.create({
      data: {
        sessionId: session.id,
        sender: 'candidate',
        content: answer,
        order: nextOrder,
      },
    });

    // If time is up, end the interview and evaluate.
    if (this.secondsRemaining(session) <= 0) {
      const result = await this.finish(userId, sessionId);
      return { ended: true, reason: 'time', result };
    }

    // Otherwise ask the AI for the next question.
    const history = [
      { role: 'user' as const, content: KICKOFF_MESSAGE },
      ...this.toClaudeMessages(session.messages),
      { role: 'user' as const, content: answer },
    ];
    const system = buildInterviewerSystemPrompt(this.metaOf(session));
    const reply = await this.ai.chatJson<InterviewerReply>(system, history);

    if (reply.action === 'end') {
      // record the closing line, then evaluate
      await this.prisma.interviewMessage.create({
        data: {
          sessionId: session.id,
          sender: 'interviewer',
          content: reply.message,
          order: nextOrder + 1,
        },
      });
      const result = await this.finish(userId, sessionId);
      return { ended: true, reason: 'complete', closing: reply.message, result };
    }

    await this.prisma.interviewMessage.create({
      data: {
        sessionId: session.id,
        sender: 'interviewer',
        content: reply.message,
        order: nextOrder + 1,
      },
    });

    return {
      ended: false,
      question: reply.message,
      secondsRemaining: this.secondsRemaining(session),
    };
  }

  // End the interview and produce the scored evaluation.
  async finish(userId: string, sessionId: string) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { order: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Interview not found');

    // If already scored, just return it.
    if (session.status === 'completed' && session.summary) {
      return {
        passProbability: session.passProbability,
        ...JSON.parse(session.summary),
      };
    }

    const transcript = session.messages
      .map(
        (m) =>
          `${m.sender === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.content}`,
      )
      .join('\n\n');

    const system = buildEvaluationSystemPrompt(this.metaOf(session));
    const evaluation = await this.ai.chatJson<{
      passProbability: number;
      overallSummary: string;
      answers: {
        question: string;
        answer: string;
        assessment: string;
        improvement: string;
      }[];
    }>(system, [
      {
        role: 'user',
        content: `Here is the full interview transcript. Score it.\n\n${transcript}`,
      },
    ]);

    const pass = Math.max(
      0,
      Math.min(100, Math.round(evaluation.passProbability ?? 0)),
    );
    const summary = {
      overallSummary: evaluation.overallSummary || '',
      answers: Array.isArray(evaluation.answers) ? evaluation.answers : [],
    };

    await this.prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        passProbability: pass,
        summary: JSON.stringify(summary),
      },
    });

    return { passProbability: pass, ...summary };
  }

  async get(userId: string, sessionId: string) {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { order: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Interview not found');
    return {
      id: session.id,
      role: session.role,
      level: session.level,
      interviewType: session.interviewType,
      durationMin: session.durationMin,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      secondsRemaining: this.secondsRemaining(session),
      passProbability: session.passProbability,
      summary: session.summary ? JSON.parse(session.summary) : null,
      messages: session.messages.map((m) => ({
        sender: m.sender,
        content: m.content,
      })),
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        role: true,
        level: true,
        interviewType: true,
        durationMin: true,
        status: true,
        passProbability: true,
        createdAt: true,
      },
    });
    return rows;
  }
}
