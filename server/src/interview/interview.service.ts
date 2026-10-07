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

interface Evaluation {
  passProbability: number;
  overallSummary: string;
  answers: {
    question: string;
    answer: string;
    assessment: string;
    improvement: string;
  }[];
}

// Forced-tool schemas: the model must return exactly these shapes.
const INTERVIEWER_TOOL = {
  name: 'interviewer_turn',
  description:
    'Say the next thing to the candidate: either ask the next question / follow-up, or end the interview with a short closing statement.',
  input_schema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['ask', 'end'] },
      message: {
        type: 'string',
        description: 'The question to ask (action=ask) or the closing statement (action=end).',
      },
    },
    required: ['action', 'message'],
  },
};

const EVALUATION_TOOL = {
  name: 'submit_evaluation',
  description: 'Submit the scored evaluation of the completed interview.',
  input_schema: {
    type: 'object',
    properties: {
      passProbability: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Estimated chance (0-100) that the candidate passes this round.',
      },
      overallSummary: { type: 'string' },
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            assessment: { type: 'string' },
            improvement: { type: 'string' },
          },
          required: ['question', 'answer', 'assessment', 'improvement'],
        },
      },
    },
    required: ['passProbability', 'overallSummary', 'answers'],
  },
};

@Injectable()
export class InterviewService {
  constructor(
    private prisma: PrismaService,
    private ai: AnthropicService,
  ) {}

  private async interviewerTurn(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<InterviewerReply> {
    const r = await this.ai.chatTool<Partial<InterviewerReply>>(
      system,
      messages,
      INTERVIEWER_TOOL,
      1024,
    );
    const message = typeof r.message === 'string' ? r.message.trim() : '';
    if (!message) {
      throw new BadRequestException('The interviewer had nothing to say — please try again');
    }
    return { action: r.action === 'end' ? 'end' : 'ask', message };
  }

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
    const reply = await this.interviewerTurn(system, [
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

    // If the previous attempt saved this answer but the AI call failed, the
    // client retries with the same text — don't store it twice.
    const lastMsg = session.messages[session.messages.length - 1];
    const isRetry =
      lastMsg?.sender === 'candidate' && lastMsg.content === answer;
    const prior = isRetry ? session.messages.slice(0, -1) : session.messages;
    const nextOrder = prior.length;
    if (!isRetry) {
      await this.prisma.interviewMessage.create({
        data: {
          sessionId: session.id,
          sender: 'candidate',
          content: answer,
          order: nextOrder,
        },
      });
    }

    // If time is up, end the interview and evaluate.
    if (this.secondsRemaining(session) <= 0) {
      const result = await this.finish(userId, sessionId);
      return { ended: true, reason: 'time', result };
    }

    // Otherwise ask the AI for the next question.
    const history = [
      { role: 'user' as const, content: KICKOFF_MESSAGE },
      ...this.toClaudeMessages(prior),
      { role: 'user' as const, content: answer },
    ];
    const system = buildInterviewerSystemPrompt(this.metaOf(session));
    const reply = await this.interviewerTurn(system, history);

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
    // Generous token budget: per-answer feedback for ~12 questions is long,
    // and a truncated reply was another way to get "unexpected format".
    const evaluation = await this.ai.chatTool<Evaluation>(
      system,
      [
        {
          role: 'user',
          content: `Here is the full interview transcript. Score it.\n\n${transcript}`,
        },
      ],
      EVALUATION_TOOL,
      6000,
    );

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

  // Context prompt for speech-to-text: role, distinctive resume terms
  // (acronyms, product/tech names) and the question being answered.
  async transcriptionHint(userId: string, sessionId: string): Promise<string> {
    const session = await this.prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { order: 'desc' }, take: 1 } },
    });
    if (!session) throw new NotFoundException('Interview not found');

    const STOP = new Set(['The', 'And', 'For', 'With', 'From', 'This', 'That', 'Our', 'Responsible', 'Developed', 'Worked', 'Led', 'Built', 'Used', 'Experience', 'Skills', 'Education', 'Summary', 'Present']);
    const counts = new Map<string, number>();
    const tokens = (session.resumeText || '').match(/[A-Za-z][A-Za-z0-9+#.\-]*[A-Za-z0-9+#]/g) || [];
    for (const t of tokens) {
      // acronyms (NAB, SIT, TLM), CamelCase / capitalised names (Kafka, PostgreSQL), tech with symbols (C#, Node.js)
      const interesting =
        /^[A-Z0-9]{2,}$/.test(t) || /[A-Z].*[A-Z]/.test(t) || /^[A-Z][a-z]+/.test(t) || /[+#.]/.test(t);
      if (!interesting || STOP.has(t) || t.length > 30) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const terms = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([t]) => t);

    const lastQuestion =
      session.messages[0]?.sender === 'interviewer' ? session.messages[0].content : '';

    let hint = `Job interview answer for a ${session.level} ${session.role} position.`;
    if (terms.length) hint += ` Terms that may be mentioned: ${terms.join(', ')}.`;
    if (lastQuestion) hint += ` Question: ${lastQuestion}`;
    return hint.slice(0, 900);
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
