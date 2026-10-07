import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewService } from './interview.service';
import { ResumeService } from '../llm/resume.service';
import { TranscribeService } from '../llm/transcribe.service';
import { CreateInterviewDto, AnswerDto } from './dto/interview.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(
    private interview: InterviewService,
    private resume: ResumeService,
    private transcriber: TranscribeService,
  ) {}

  // Feature flags for the client (declared before ':id' routes).
  @Get('config')
  config() {
    return { aiTranscription: this.transcriber.enabled };
  }

  // Parse an uploaded resume (PDF/DOCX) into text.
  @Post('resume')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async parseResume(@UploadedFile() file: any) {
    const text = await this.resume.extractText(file);
    return { text };
  }

  // Start a new interview (returns the first question).
  @Post()
  create(@GetUser('userId') userId: string, @Body() dto: CreateInterviewDto) {
    return this.interview.create(userId, dto);
  }

  // Submit an answer; returns the next question or the final result.
  @Post(':id/answer')
  answer(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AnswerDto,
  ) {
    return this.interview.answer(userId, id, dto.answer);
  }

  // Transcribe a recorded voice answer (multipart "audio"). The session's
  // role, resume terms and current question are used as a vocabulary hint.
  @Post(':id/transcribe')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: 24 * 1024 * 1024 } }),
  )
  async transcribe(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
    @UploadedFile() audio: any,
  ) {
    const hint = await this.interview.transcriptionHint(userId, id);
    const text = await this.transcriber.transcribe(audio, hint);
    return { text };
  }

  // Force-end the interview and get the evaluation.
  @Post(':id/finish')
  finish(@GetUser('userId') userId: string, @Param('id') id: string) {
    return this.interview.finish(userId, id);
  }

  @Get(':id')
  get(@GetUser('userId') userId: string, @Param('id') id: string) {
    return this.interview.get(userId, id);
  }

  @Get()
  list(@GetUser('userId') userId: string) {
    return this.interview.list(userId);
  }
}
