import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_KEY_LEN = 300;
const MAX_VALUE_BYTES = 256 * 1024; // 256 KB per key is plenty for progress maps

@Injectable()
export class StateService {
  constructor(private prisma: PrismaService) {}

  private checkKey(key: string) {
    if (!key || key.length > MAX_KEY_LEN) {
      throw new BadRequestException('Invalid state key');
    }
  }

  // { [key]: value } for everything this user has stored.
  async getAll(userId: string) {
    const rows = await this.prisma.userState.findMany({ where: { userId } });
    const out: Record<string, unknown> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  async put(userId: string, key: string, value: unknown) {
    this.checkKey(key);
    if (JSON.stringify(value ?? null).length > MAX_VALUE_BYTES) {
      throw new BadRequestException('State value too large');
    }
    const json = value as Prisma.InputJsonValue;
    const row = await this.prisma.userState.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: json },
      update: { value: json },
    });
    return { key: row.key, value: row.value, updatedAt: row.updatedAt };
  }

  async remove(userId: string, key: string) {
    this.checkKey(key);
    await this.prisma.userState.deleteMany({ where: { userId, key } });
    return { ok: true };
  }
}
