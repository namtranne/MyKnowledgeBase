import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private client: Anthropic | null = null;
  private readonly model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new InternalServerErrorException(
          'ANTHROPIC_API_KEY is not configured on the server',
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /**
   * Send a conversation to Claude and return the plain text reply.
   */
  async chat(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    maxTokens = 1024,
  ): Promise<string> {
    const client = this.getClient();
    try {
      const res = await client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages,
      });
      return res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
    } catch (err) {
      this.logger.error(`Anthropic request failed: ${err?.message || err}`);
      throw new InternalServerErrorException('AI request failed');
    }
  }

  /**
   * Structured output via forced tool use: Claude must call `tool`, and its
   * validated `input` object is returned. Far more reliable than asking for
   * JSON in prose — the model can't drift into plain-text replies.
   */
  async chatTool<T = any>(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    tool: { name: string; description: string; input_schema: Record<string, any> },
    maxTokens = 2048,
  ): Promise<T> {
    const client = this.getClient();
    let res: Anthropic.Message;
    try {
      res = await client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system,
        messages,
        tools: [tool as any],
        tool_choice: { type: 'tool', name: tool.name },
      });
    } catch (err) {
      this.logger.error(`Anthropic request failed: ${err?.message || err}`);
      throw new InternalServerErrorException('AI request failed');
    }
    const block = res.content.find((b) => b.type === 'tool_use') as
      | { type: 'tool_use'; input: unknown }
      | undefined;
    if (!block || !block.input || typeof block.input !== 'object') {
      this.logger.error(
        `No tool_use block (stop_reason=${res.stop_reason}): ${JSON.stringify(res.content).slice(0, 500)}`,
      );
      throw new InternalServerErrorException('AI returned an unexpected format');
    }
    if (res.stop_reason === 'max_tokens') {
      this.logger.warn(`Tool output hit max_tokens (${maxTokens}); result may be truncated`);
    }
    return block.input as T;
  }

  /**
   * Same as chat(), but parses the reply as JSON. Tolerates code fences and
   * surrounding prose by extracting the first {...} block.
   */
  async chatJson<T = any>(
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    maxTokens = 2048,
  ): Promise<T> {
    const raw = await this.chat(system, messages, maxTokens);
    return this.parseJson<T>(raw);
  }

  private parseJson<T>(raw: string): T {
    let text = raw.trim();
    // strip ```json ... ``` fences if present
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) text = fence[1].trim();
    // otherwise grab the outermost JSON object
    if (!text.startsWith('{')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      this.logger.error(`Failed to parse JSON from model: ${raw.slice(0, 500)}`);
      throw new InternalServerErrorException('AI returned an unexpected format');
    }
  }
}
