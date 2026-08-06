import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertItemDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistService {
  constructor(private prisma: PrismaService) {}

  // Return all of a user's item states, grouped by category:
  // { [categoryId]: { [itemId]: { checked, answer } } }
  async getAll(userId: string) {
    const rows = await this.prisma.itemState.findMany({ where: { userId } });
    const byCategory: Record<
      string,
      Record<string, { checked: boolean; answer: string }>
    > = {};
    for (const r of rows) {
      (byCategory[r.categoryId] ||= {})[r.itemId] = {
        checked: r.checked,
        answer: r.answer,
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

  // Clear all progress for a single category (used by the "Reset" button).
  async resetCategory(userId: string, categoryId: string) {
    await this.prisma.itemState.deleteMany({ where: { userId, categoryId } });
    return { ok: true };
  }
}
