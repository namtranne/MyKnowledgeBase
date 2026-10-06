import { Global, Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { ResumeService } from './resume.service';

@Global()
@Module({
  providers: [AnthropicService, ResumeService],
  exports: [AnthropicService, ResumeService],
})
export class LlmModule {}
