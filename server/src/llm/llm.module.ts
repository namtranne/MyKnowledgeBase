import { Global, Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { ResumeService } from './resume.service';
import { TranscribeService } from './transcribe.service';
import { VoiceController } from './voice.controller';

@Global()
@Module({
  controllers: [VoiceController],
  providers: [AnthropicService, ResumeService, TranscribeService],
  exports: [AnthropicService, ResumeService, TranscribeService],
})
export class LlmModule {}
