import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ChecklistModule } from './checklist/checklist.module';
import { LlmModule } from './llm/llm.module';
import { InterviewModule } from './interview/interview.module';
import { StateModule } from './state/state.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LlmModule,
    AuthModule,
    ChecklistModule,
    InterviewModule,
    StateModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
