import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';

// Speech-to-text for voice answers, via OpenAI's transcription API
// (Anthropic has no speech-to-text endpoint). Uses Node 20's built-in
// fetch/FormData/Blob — no extra dependency.
//
// Env:
//   OPENAI_API_KEY            required to enable AI transcription
//   OPENAI_TRANSCRIBE_MODEL   default "gpt-4o-mini-transcribe" (~$0.003/min);
//                             "gpt-4o-transcribe" is more accurate (~$0.006/min)
@Injectable()
export class TranscribeService {
  private readonly logger = new Logger(TranscribeService.name);
  private readonly model =
    process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

  get enabled(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * @param prompt vocabulary/context hint (names, acronyms, tech terms) —
   *               greatly improves accuracy on things like "NAB" or "Kafka".
   */
  async transcribe(
    file: { buffer: Buffer; mimetype: string; originalname?: string; size?: number },
    prompt: string,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new NotImplementedException('AI transcription is not configured on the server');
    }
    if (!file?.buffer?.length) throw new BadRequestException('No audio received');

    const mime = (file.mimetype || '').split(';')[0] || 'audio/webm';
    const ext =
      mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac') ? 'mp4'
      : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3'
      : mime.includes('wav') ? 'wav'
      : mime.includes('ogg') ? 'ogg'
      : 'webm';

    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: mime }), `answer.${ext}`);
    form.append('model', this.model);
    form.append('language', 'en');
    form.append('response_format', 'json');
    if (prompt) form.append('prompt', prompt);

    let res: Response;
    try {
      res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch (err) {
      this.logger.error(`Transcription request failed: ${err?.message || err}`);
      throw new InternalServerErrorException('Transcription service unreachable');
    }

    const body = await res.text();
    if (!res.ok) {
      this.logger.error(`Transcription error ${res.status}: ${body.slice(0, 500)}`);
      throw new InternalServerErrorException('Transcription failed');
    }
    try {
      return String(JSON.parse(body).text || '').trim();
    } catch {
      return body.trim();
    }
  }
}
