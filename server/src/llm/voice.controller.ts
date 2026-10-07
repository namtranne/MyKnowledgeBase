import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TranscribeService } from './transcribe.service';

// General voice input (used by the interview checklist answer boxes).
@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private transcriber: TranscribeService) {}

  // GET /api/voice/config -> { aiTranscription }
  @Get('config')
  config() {
    return { aiTranscription: this.transcriber.enabled };
  }

  // POST /api/voice/transcribe  multipart: audio (file), hint (optional text)
  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('audio', { limits: { fileSize: 24 * 1024 * 1024 } }),
  )
  async transcribe(@UploadedFile() audio: any, @Body('hint') hint?: string) {
    const text = await this.transcriber.transcribe(
      audio,
      typeof hint === 'string' ? hint.slice(0, 900) : '',
    );
    return { text };
  }
}
