import { Injectable, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
// pdf-parse has no type declarations; require it lazily to avoid its debug
// entrypoint that runs on import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

@Injectable()
export class ResumeService {
  /**
   * Extract plain text from an uploaded resume (PDF or DOCX).
   */
  async extractText(file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No resume file provided');
    }

    const name = (file.originalname || '').toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || name.endsWith('.pdf');
    const isDocx =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx');

    let text = '';
    try {
      if (isPdf) {
        const data = await pdfParse(file.buffer);
        text = data.text || '';
      } else if (isDocx) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value || '';
      } else {
        throw new BadRequestException('Please upload a PDF or DOCX file');
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Could not read that resume file');
    }

    text = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length < 30) {
      throw new BadRequestException(
        'Could not extract enough text from the resume. If it is a scanned image, please paste the text instead.',
      );
    }
    // keep the prompt bounded
    return text.slice(0, 15000);
  }
}
