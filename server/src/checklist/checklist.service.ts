import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradeItemDto, UpsertItemDto } from './dto/checklist.dto';
import { AnthropicService } from '../llm/anthropic.service';
import {
  GRADE_TOOL,
  buildGradingSystemPrompt,
  buildGradingUserMessage,
} from './grading.prompts';

@Injectable()
export class ChecklistService {
  constructor(
    private prisma: PrismaService,
    private ai: AnthropicService,
  ) {}

  // Return all of a user's item states, grouped by category:
  // { [categoryId]: { [itemId]: { checked, answer } } }
  async getAll(userId: string) {
    const rows = await this.prisma.itemState.findMany({ where: { userId } });
    const byCategory: Record<
      string,
      Record<
        string,
        { checked: boolean; answer: string; feedback: unknown; gradedAt: Date | null }
      >
    > = {};
    for (const r of rows) {
      (byCategory[r.categoryId] ||= {})[r.itemId] = {
        checked: r.checked,
        answer: r.answer,
        feedback: r.feedback ?? null,
        gradedAt: r.gradedAt,
      };
    }
    return byCategory;
  }

  async upsertItem(userId: string, itemId: string, dto: UpsertItemDto) {
    const data: { checked?: boolean; answer?: string } = {};
    if (dto.checked !== undefined) data.checked = dto.checked;
    if (dto.answer !== undefined) data.answer = dto.answer;

    const row = await this.prisma.itemState.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: {
        userId,
        itemId,
        categoryId: dto.categoryId,
        checked: dto.checked ?? false,
        answer: dto.answer ?? '',
      },
      update: data,
    });
    return {
      itemId: row.itemId,
      categoryId: row.categoryId,
      checked: row.checked,
      answer: row.answer,
    };
  }

  // Grade an answer with the AI, then save the answer + feedback for the user.
  async gradeItem(userId: string, itemId: string, dto: GradeItemDto) {
    const level = dto.level || 'Mid';
    const result = await this.ai.chatTool<Record<string, any>>(
      buildGradingSystemPrompt(dto.categoryId, level),
      [{ role: 'user', content: buildGradingUserMessage(dto) }],
      GRADE_TOOL,
      3000,
    );
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    const feedback = {
      score: Math.max(0, Math.min(10, Math.round(Number(result.score) || 0))),
      verdict: ['strong', 'good', 'needs-work', 'weak'].includes(result.verdict)
        ? result.verdict
        : 'needs-work',
      summary: String(result.summary || ''),
      strengths: arr(result.strengths),
      gaps: arr(result.gaps),
      missingPoints: arr(result.missingPoints),
      modelAnswer: String(result.modelAnswer || ''),
      followUpQuestions: arr(result.followUpQuestions),
      languageTips: arr(result.languageTips),
      level,
      gradedAnswer: dto.answer, // lets the UI flag feedback as stale after edits
    };
    const gradedAt = new Date();
    await this.prisma.itemState.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: {
        userId,
        itemId,
        categoryId: dto.categoryId,
        answer: dto.answer,
        feedback,
        gradedAt,
      },
      update: { answer: dto.answer, feedback, gradedAt },
    });
    return { itemId, answer: dto.answer, feedback, gradedAt };
  }

  async removeItem(userId: string, itemId: string) {
    await this.prisma.itemState.deleteMany({ where: { userId, itemId } });
    return { ok: true };
  }

    // Clear all progress for a single category (used by the "Reset" button).
  async resetCategory(userId: string, categoryId: string) {
    await this.prisma.itemState.deleteMany({ where: { userId, categoryId } });
    return { ok: true };
  }
}
