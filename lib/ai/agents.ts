import { getAIChatResponse } from './deepseek';

export interface WritingEvaluation {
  estimatedBand: number;
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammarAccuracy: number;
  strengths: string[];
  weaknesses: string[];
  suggestedImprovements: string[];
  improvedVersion: string;
  paragraphFeedback?: { label: string; strength: string; priority: string; suggestion: string }[];
  checklist?: string[];
  bandRationale?: string;
  focusCriterion?: string;
}

export interface SpeakingEvaluation {
  estimatedBand: number;
  fluencyScore: number;
  pronunciationScore: number | null;
  vocabularyScore: number;
  grammarScore: number;
  detailedFeedback: string;
  suggestedImprovements: string[];
}

export interface RoadmapStep {
  title: string;
  description: string;
  focusArea: string;
  recommendedHours: number;
}

export interface RoadmapPlan {
  level: 'Foundation' | 'Intermediate' | 'Advanced';
  estimatedWeeks: number;
  steps: RoadmapStep[];
}

const band = (value: unknown, label: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 9) throw new Error(`Invalid ${label}.`);
  return Math.round(number * 2) / 2;
};

const textList = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`Invalid ${label}.`);
  return value.slice(0, 10).map(item => item.slice(0, 1_000));
};

function parseWritingEvaluation(value: unknown): WritingEvaluation {
  if (!value || typeof value !== 'object') throw new Error('Invalid writing evaluation.');
  const item = value as Record<string, unknown>;
  if (typeof item.improvedVersion !== 'string') throw new Error('Invalid improved version.');
  return {
    estimatedBand: band(item.estimatedBand, 'estimated band'),
    taskAchievement: band(item.taskAchievement, 'task achievement'),
    coherenceCohesion: band(item.coherenceCohesion, 'coherence score'),
    lexicalResource: band(item.lexicalResource, 'lexical score'),
    grammarAccuracy: band(item.grammarAccuracy, 'grammar score'),
    strengths: textList(item.strengths, 'strengths'),
    weaknesses: textList(item.weaknesses, 'weaknesses'),
    suggestedImprovements: textList(item.suggestedImprovements, 'suggestions'),
    improvedVersion: item.improvedVersion.slice(0, 30_000),
    paragraphFeedback: Array.isArray(item.paragraphFeedback) ? item.paragraphFeedback as WritingEvaluation['paragraphFeedback'] : [],
    checklist: Array.isArray(item.checklist) ? textList(item.checklist, 'checklist') : [],
    bandRationale: typeof item.bandRationale === 'string' ? item.bandRationale.slice(0, 2_000) : undefined,
    focusCriterion: typeof item.focusCriterion === 'string' ? item.focusCriterion.slice(0, 100) : undefined,
  };
}

function parseSpeakingEvaluation(value: unknown): SpeakingEvaluation {
  if (!value || typeof value !== 'object') throw new Error('Invalid speaking evaluation.');
  const item = value as Record<string, unknown>;
  if (typeof item.detailedFeedback !== 'string') throw new Error('Invalid speaking feedback.');
  return {
    estimatedBand: band(item.estimatedBand, 'estimated band'),
    fluencyScore: band(item.fluencyScore, 'fluency score'),
    pronunciationScore: item.pronunciationScore == null ? null : band(item.pronunciationScore, 'pronunciation score'),
    vocabularyScore: band(item.vocabularyScore, 'vocabulary score'),
    grammarScore: band(item.grammarScore, 'grammar score'),
    detailedFeedback: item.detailedFeedback.slice(0, 4_000),
    suggestedImprovements: textList(item.suggestedImprovements, 'suggestions'),
  };
}

/**
 * 1. AI Tutor Agent
 */
export async function getTutorResponse(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const systemPrompt = `You are IELTS AI Master, a world-class personal IELTS tutor. 
Your goal is to help the student achieve band 8.0+.
Provide clear explanations, grammar corrections, study tips, or vocabulary definitions. 
Keep your explanations highly structured, encouraging, and focused on practical exam tips (e.g. key vocabulary collocations, sentence structures).`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  return getAIChatResponse({ messages, temperature: 0.6 });
}

/**
 * 2. Writing Examiner Agent
 */
export async function evaluateEssay(
  prompt: string,
  essay: string,
  apiKeyOverride?: string
): Promise<WritingEvaluation> {
  const systemPrompt = `You are a certified senior IELTS Writing Examiner.
Evaluate the essay strictly according to the official IELTS criteria (Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy).
You MUST respond with a valid JSON object matching the following structure:
{
  "estimatedBand": 6.5,
  "taskAchievement": 6.0,
  "coherenceCohesion": 6.5,
  "lexicalResource": 7.0,
  "grammarAccuracy": 6.5,
  "strengths": ["Strengths point 1", "Strengths point 2"],
  "weaknesses": ["Weakness point 1", "Weakness point 2"],
  "suggestedImprovements": ["Improvement suggestion 1", "Improvement suggestion 2"],
  "improvedVersion": "A fully rewritten band 9.0 version of the student's essay."
}
Return only JSON. Do not include markdown code block syntax.`;

  const userPrompt = `PROMPT:\n${prompt}\n\nSTUDENT ESSAY:\n${essay}`;

  const responseText = await getAIChatResponse({
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
    temperature: 0.3,
    jsonMode: true,
    apiKeyOverride,
  });

  try {
    // Strip markdown formatting if the model still generated it
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return parseWritingEvaluation(JSON.parse(cleanJson));
  } catch {
    console.error('Failed to parse AI writing evaluation JSON. Response was:', responseText);
    throw new Error('AI grading failed to return readable results.');
  }
}

/**
 * 3. Speaking Examiner Agent
 */
export async function evaluateSpeaking(
  topic: string,
  transcript: string
): Promise<SpeakingEvaluation> {
  const systemPrompt = `You are a certified senior IELTS Speaking Examiner.
Evaluate the transcript of the student's response for the given topic.
Assess Fluency and Coherence, Lexical Resource, and Grammatical Range and Accuracy from the transcript.
Audio is not available to you, so do not infer pronunciation. Return null for pronunciationScore.
Provide detailed constructive feedback.
You MUST respond with a valid JSON object matching the following structure:
{
  "estimatedBand": 6.0,
  "fluencyScore": 6.0,
  "pronunciationScore": null,
  "vocabularyScore": 6.5,
  "grammarScore": 6.0,
  "detailedFeedback": "Detailed constructive evaluation text...",
  "suggestedImprovements": ["Improvement advice 1", "Improvement advice 2"]
}
Return only JSON. Do not include markdown code block syntax.`;

  const userPrompt = `TOPIC: ${topic}\n\nTRANSCRIPT:\n${transcript}`;

  const responseText = await getAIChatResponse({
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
    temperature: 0.3,
    jsonMode: true,
  });

  try {
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return parseSpeakingEvaluation(JSON.parse(cleanJson));
  } catch {
    console.error('Failed to parse AI speaking evaluation JSON. Response was:', responseText);
    throw new Error('AI speaking evaluation failed to return readable results.');
  }
}

/**
 * 4. Vocabulary Coach Agent
 */
export async function generateVocabularyDetails(
  word: string,
  targetBand: number = 7.5
): Promise<{
  definition: string;
  ipa: string;
  collocations: string[];
  examples: string[];
  synonyms: string[];
}> {
  const systemPrompt = `You are an IELTS Vocabulary Coach. 
Analyze the word and provide its definition, standard IPA pronunciation, typical high-scoring IELTS collocations, contextual sentences, and academic synonyms.
You MUST respond with a valid JSON object matching the following structure:
{
  "definition": "Clear concise definition suitable for IELTS learners",
  "ipa": "/aɪˈɛlts/",
  "collocations": ["collocation 1", "collocation 2"],
  "examples": ["Example sentence illustrating the word's academic usage"],
  "synonyms": ["synonym 1", "synonym 2"]
}
Return only JSON. Do not include markdown code block syntax.`;

  const responseText = await getAIChatResponse({
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Target Word: "${word}". Target band level: ${targetBand}` },
    ],
    temperature: 0.5,
    jsonMode: true,
  });

  try {
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    console.error('Failed to parse AI vocabulary Coach JSON. Response was:', responseText);
    return {
      definition: 'Definition lookup currently unavailable.',
      ipa: '',
      collocations: [],
      examples: [`We studied ${word} to boost our IELTS preparation.`],
      synonyms: [],
    };
  }
}

/**
 * 5. Study Planner Agent
 */
export async function generateStudyRoadmap(
  currentBand: number,
  targetBand: number,
  examDate: string,
  dailyHours: number
): Promise<RoadmapPlan> {
  const systemPrompt = `You are an IELTS Study Planner.
Generate a structured, personalized learning roadmap matching the target band and time constraints.
Determine if they should focus on "Foundation" (band < 5.0), "Intermediate" (band 5.0 - 6.5), or "Advanced" (band >= 7.0).
You MUST respond with a valid JSON object matching the following structure:
{
  "level": "Intermediate",
  "estimatedWeeks": 8,
  "steps": [
    {
      "title": "Topic or module name",
      "description": "Specific focus of the module...",
      "focusArea": "Reading / Writing / Listening / Speaking / Vocabulary / Grammar",
      "recommendedHours": 10
    }
  ]
}
Return only JSON. Do not include markdown code block syntax.`;

  const userPrompt = `Current Band: ${currentBand}
Target Band: ${targetBand}
Exam Date: ${examDate}
Daily Hours Available: ${dailyHours}`;

  const responseText = await getAIChatResponse({
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ],
    temperature: 0.4,
    jsonMode: true,
  });

  try {
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson) as RoadmapPlan;
  } catch {
    console.error('Failed to parse AI study planner JSON. Response was:', responseText);
    throw new Error('Study Planner agent failed to output valid plan.');
  }
}
