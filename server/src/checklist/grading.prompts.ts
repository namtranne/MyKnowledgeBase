// Prompt + tool schema for grading a single interview-checklist answer.

const CATEGORY_RUBRIC: Record<string, string> = {
  behavioural:
    'A real, specific situation; clear personal ownership ("I", not "we"); STAR structure; measurable result; reflection/learning; scope appropriate to the level. Penalise hypothetical or generic answers.',
  experience:
    'Concrete description of their own system and role; architecture and decisions with reasons; trade-offs; metrics/impact; what they would do differently. Penalise vague or buzzword-only answers.',
  'system-design':
    'Clarified requirements and scale; sensible components and data flow; data model; explicit trade-offs; failure modes and scaling; correctness of the concepts used.',
  'object-design':
    'Correct OOP/design concepts; well-chosen entities and relationships; single-responsibility classes; appropriate patterns and why; state modelling; extensibility; concurrency/edge cases; concrete examples or code.',
  microservices:
    'Correct concepts; when to use / when not to; trade-offs; failure handling; real production considerations and examples.',
  databases:
    'Technical correctness; how it works internally where relevant; trade-offs; performance implications; concrete examples (queries, schemas).',
  'cs-fundamentals':
    'Correctness; complexity analysis; edge cases; clear explanation; working code or precise pseudo-code where asked.',
  math: 'Correct result; sound reasoning shown step by step; correct use of formulas; sanity checks.',
};

export function buildGradingSystemPrompt(categoryId: string, level: string): string {
  const rubric =
    CATEGORY_RUBRIC[categoryId] ||
    'Correctness, depth, structure, concrete examples, and clarity.';
  return `You are a demanding but fair senior interviewer reviewing a candidate's prepared answer to an interview question, judged at the ${level} level for a software engineering role.

What a strong answer to this kind of question shows: ${rubric}

How to grade:
- score is 0-10 against what would satisfy a real interviewer at the ${level} level: 9-10 excellent / would impress, 7-8 solid hire-level answer, 5-6 partially there with clear gaps, 3-4 weak, 0-2 wrong, off-topic or nearly empty.
- Be specific: quote or reference parts of THEIR answer in strengths and gaps. No generic advice like "add more detail" without saying which detail.
- missingPoints lists the most important concepts/facts the answer omitted or got wrong (technical correctness matters — flag errors explicitly).
- modelAnswer: a concise, interview-ready outline of a strong answer (bullets or short paragraphs, code only if the question asks for it). For behavioural/experience questions do NOT invent the candidate's experiences — give the structure and the specific elements their story should contain, reusing details from their answer where possible.
- followUpQuestions: 2-3 probing follow-ups a real interviewer would ask next given THIS answer.
- languageTips: up to 3 short fixes only if the English phrasing would noticeably hurt in a real interview; otherwise an empty list. Ignore speech-to-text artifacts (misheard words, missing punctuation).
- Write the feedback in English.

Always respond by calling the submit_grade tool.`;
}

export const GRADE_TOOL = {
  name: 'submit_grade',
  description: 'Submit the grading of the candidate answer.',
  input_schema: {
    type: 'object',
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 10 },
      verdict: { type: 'string', enum: ['strong', 'good', 'needs-work', 'weak'] },
      summary: { type: 'string', description: '1-2 sentence overall assessment' },
      strengths: { type: 'array', items: { type: 'string' } },
      gaps: { type: 'array', items: { type: 'string' } },
      missingPoints: { type: 'array', items: { type: 'string' } },
      modelAnswer: { type: 'string' },
      followUpQuestions: { type: 'array', items: { type: 'string' } },
      languageTips: { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'verdict', 'summary', 'strengths', 'gaps', 'missingPoints', 'modelAnswer', 'followUpQuestions', 'languageTips'],
  },
};

export function buildGradingUserMessage(q: {
  question: string;
  note?: string;
  section?: string;
  answer: string;
}): string {
  return `Question: ${q.question}
${q.section ? `Topic area: ${q.section}\n` : ''}${q.note ? `Hint shown to the candidate: ${q.note}\n` : ''}
Candidate's answer (may be dictated with speech-to-text):
"""
${q.answer}
"""`;
}
