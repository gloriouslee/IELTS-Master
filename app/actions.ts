'use server';

import { getTutorResponse, evaluateEssay, evaluateSpeaking, WritingEvaluation, SpeakingEvaluation } from '@/lib/ai/agents';
import { getAIChatResponse } from '@/lib/ai/deepseek';
import { transcribeAudio } from '@/lib/ai/whisper';
import { createClient } from '@/lib/supabase/server';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

async function authorizeAIAction(feature: string) {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (!hasSupabase) return null;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('You must be signed in to use AI features.');

  const { data: allowed, error: quotaError } = await supabase.rpc('consume_ai_quota', {
    p_feature: feature,
    p_limit: 10,
  });
  if (quotaError) {
    // Keep a local fallback while the newest migration is being deployed.
    const now = Date.now();
    const current = rateLimit.get(user.id);
    if (!current || current.resetAt <= now) rateLimit.set(user.id, { count: 1, resetAt: now + 60_000 });
    else {
      if (current.count >= 10) throw new Error('Too many AI requests. Please wait a minute.');
      current.count += 1;
    }
  } else if (!allowed) {
    throw new Error('Too many AI requests. Please wait a minute.');
  }

  return { supabase, user };
}

const requireText = (value: string, label: string, max: number) => {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} is required.`);
  if (clean.length > max) throw new Error(`${label} is too long.`);
  return clean;
};

async function awardActivity(auth: Awaited<ReturnType<typeof authorizeAIAction>>, type: string) {
  if (!auth) return;
  const { error } = await auth.supabase.rpc('award_activity', {
    p_event_key: crypto.randomUUID(), p_activity_type: type,
  });
  if (error) console.error('Unable to award activity:', error.message);
}

export async function generateWritingPromptAction(topic: string, type: string, apiKey?: string): Promise<string> {
  await authorizeAIAction('writing_prompt');
  topic = requireText(topic || 'education', 'Topic', 100);
  type = requireText(type || 'discussion', 'Essay type', 50);
  if (!apiKey && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) return `Some people believe that ${topic || 'modern society'} should be addressed by governments, while others think individuals should take responsibility. Discuss both views and give your own opinion.`;
  return getAIChatResponse({ apiKeyOverride: apiKey, temperature: 0.7, messages: [{ role: 'system', content: 'Create one authentic IELTS Academic Writing Task 2 prompt. Return only the prompt, no title or explanation.' }, { role: 'user', content: `Topic: ${topic || 'education'}. Essay type: ${type || 'discussion'}.` }] });
}

export type GeneratedVocabulary = {
  word: string;
  ipa: string;
  definition: string;
  collocations: string[];
  examples: string[];
  synonyms: string[];
};

export type GeneratedReadingPractice = {
  title: string;
  level: string;
  paragraphs: { label: string; text: string }[];
  questions: { id: string; prompt: string; options?: string[]; answer: string; evidence: string; instruction?: string }[];
};

const fallbackReadingPractice: GeneratedReadingPractice = {
  title: 'Public libraries in the digital age', level: 'Target Band 6.0–7.5',
  paragraphs: [
    { label: 'A', text: 'Predictions that digital media would make public libraries obsolete have proved premature. Although visitors can now obtain many texts without entering a building, libraries continue to provide free access to information, reliable internet connections and quiet places to work.' },
    { label: 'B', text: 'Their role has also broadened. Many libraries lend tools, host language classes and offer help with online government forms. These services are especially valuable to people who have limited equipment at home or who are unfamiliar with rapidly changing digital systems.' },
    { label: 'C', text: 'However, expanding services brings practical difficulties. Staff need new training, while budgets must cover both printed collections and technology. A successful library cannot simply purchase new devices; it must decide which services reflect the needs of its particular community.' },
    { label: 'D', text: 'For this reason, some library managers consult local residents before changing their services. A neighbourhood with many students may prioritise study space, whereas another with older residents may focus on digital support. The most effective libraries adapt without abandoning their original purpose: making knowledge available to everyone.' },
  ],
  questions: [
    { id: 'q1', prompt: 'Which paragraph describes services that extend beyond borrowing books?', options: ['A', 'B', 'C', 'D'], answer: 'B', evidence: 'Paragraph B lists tools, classes and help with online forms.' },
    { id: 'q2', prompt: 'Libraries provide internet access for people who cannot always get it at home.', options: ['True', 'False', 'Not Given'], answer: 'True', evidence: 'Paragraph B refers to people with limited equipment at home.' },
    { id: 'q3', prompt: 'All libraries should offer exactly the same services.', options: ['True', 'False', 'Not Given'], answer: 'False', evidence: 'Paragraph C says services should reflect each particular community.' },
    { id: 'q4', prompt: 'Library budgets have increased in every country.', options: ['True', 'False', 'Not Given'], answer: 'Not Given', evidence: 'The passage mentions budget pressure but gives no international comparison.' },
    { id: 'q5', prompt: 'Choose the best heading for paragraph C.', instruction: 'Matching heading', options: ['i  Meeting local needs', 'ii  The cost of wider services', 'iii  A decline in visitors', 'iv  New buildings'], answer: 'ii', evidence: 'Paragraph C focuses on training, budgets and the challenge of expanding services.' },
    { id: 'q6', prompt: 'Choose the best heading for paragraph D.', instruction: 'Matching heading', options: ['i  Meeting local needs', 'ii  The cost of wider services', 'iii  A decline in visitors', 'iv  New buildings'], answer: 'i', evidence: 'Paragraph D explains how managers adapt services after consulting residents.' },
    { id: 'q7', prompt: 'Complete the sentence: Libraries can provide a quiet place to ______.', instruction: 'Use ONE WORD from the passage', answer: 'work', evidence: 'Paragraph A says libraries provide quiet places to work.' },
    { id: 'q8', prompt: 'Complete the sentence: Managers may consult local ______ before changing services.', instruction: 'Use ONE WORD from the passage', answer: 'residents', evidence: 'Paragraph D states that managers consult local residents.' },
  ],
};

function normalizeGeneratedReadingPractice(value: unknown): GeneratedReadingPractice {
  const practice = value as Partial<GeneratedReadingPractice>;
  if (!practice || typeof practice.title !== 'string' || !Array.isArray(practice.paragraphs) || !Array.isArray(practice.questions)) throw new Error('The AI returned an invalid Reading practice set.');
  const paragraphs = practice.paragraphs.slice(0, 4).map((paragraph, index) => {
    const item = paragraph as { label?: unknown; text?: unknown };
    if (typeof item.text !== 'string' || !item.text.trim()) throw new Error('The AI returned an invalid passage.');
    return { label: String(item.label || String.fromCharCode(65 + index)).slice(0, 2), text: item.text.trim().slice(0, 1_500) };
  });
  const questions = practice.questions.slice(0, 8).map((question, index) => {
    const item = question as GeneratedReadingPractice['questions'][number];
    if (typeof item.prompt !== 'string' || typeof item.answer !== 'string' || typeof item.evidence !== 'string') throw new Error('The AI returned an invalid question.');
    return { id: `q${index + 1}`, prompt: item.prompt.slice(0, 500), answer: item.answer.slice(0, 100), evidence: item.evidence.slice(0, 500), instruction: item.instruction?.slice(0, 120), options: Array.isArray(item.options) ? item.options.slice(0, 6).map(option => String(option).slice(0, 160)) : undefined };
  });
  if (paragraphs.length < 3 || questions.length !== 8) throw new Error('The AI did not create a complete Reading practice set.');
  return { title: practice.title.trim().slice(0, 140), level: typeof practice.level === 'string' ? practice.level.slice(0, 80) : 'Target Band 6.0–7.5', paragraphs, questions };
}

export async function generateReadingPracticeAction(apiKey?: string): Promise<GeneratedReadingPractice> {
  await authorizeAIAction('reading_generation');
  if (!apiKey && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) return fallbackReadingPractice;
  const response = await getAIChatResponse({ apiKeyOverride: apiKey, temperature: 0.75, jsonMode: true, messages: [
    { role: 'system', content: 'Create one original IELTS Academic Reading mini-practice. Return valid JSON only. Use exactly 4 paragraphs and exactly 8 questions. Include answer and evidence for every question. Include 1 paragraph-location multiple choice, 3 True/False/Not Given, 2 matching-heading questions, and 2 one/two-word completion questions. Answers must be directly supported by the passage. Never reuse copyrighted passages.' },
    { role: 'user', content: 'Use an accessible academic topic. JSON schema: {"title":"string","level":"string","paragraphs":[{"label":"A","text":"string"}],"questions":[{"prompt":"string","instruction":"string optional","options":["string"] optional,"answer":"string","evidence":"string"}]}' },
  ] });
  try { return normalizeGeneratedReadingPractice(JSON.parse(response)); }
  catch (error) { console.error('Unable to parse generated Reading practice:', error); throw new Error('AI could not create a complete Reading practice set. Please try again.'); }
}

const topicWordSets: Record<string, GeneratedVocabulary[]> = {
  environment: [
    { word: 'Mitigate', ipa: '/ˈmɪtɪɡeɪt/', definition: 'To make a harmful situation less severe.', collocations: ['mitigate climate change', 'mitigate the impact'], examples: ['Governments must mitigate the environmental impact of rapid urbanisation.'], synonyms: ['alleviate', 'reduce', 'lessen'] },
    { word: 'Sustainable', ipa: '/səˈsteɪnəbəl/', definition: 'Able to continue without causing long-term environmental harm.', collocations: ['sustainable development', 'sustainable energy'], examples: ['Cities need sustainable transport systems to reduce emissions.'], synonyms: ['viable', 'renewable', 'durable'] },
    { word: 'Biodiversity', ipa: '/ˌbaɪəʊdaɪˈvɜːsəti/', definition: 'The variety of plant and animal life in an area.', collocations: ['protect biodiversity', 'loss of biodiversity'], examples: ['Deforestation is a major cause of biodiversity loss.'], synonyms: ['biological diversity', 'ecosystem variety'] },
  ],
  education: [
    { word: 'Curriculum', ipa: '/kəˈrɪkjələm/', definition: 'The subjects and content taught in a course of study.', collocations: ['school curriculum', 'revise the curriculum'], examples: ['Digital literacy should be included in the national curriculum.'], synonyms: ['syllabus', 'course of study'] },
    { word: 'Pedagogical', ipa: '/ˌpedəˈɡɒdʒɪkəl/', definition: 'Related to teaching methods and education.', collocations: ['pedagogical approach', 'pedagogical practice'], examples: ['A learner-centred pedagogical approach can improve engagement.'], synonyms: ['educational', 'instructional'] },
    { word: 'Literacy', ipa: '/ˈlɪtərəsi/', definition: 'The ability to read and write, or competence in a particular field.', collocations: ['digital literacy', 'improve literacy rates'], examples: ['Schools should improve students’ financial literacy.'], synonyms: ['proficiency', 'competence'] },
  ],
  technology: [
    { word: 'Ubiquitous', ipa: '/juːˈbɪkwɪtəs/', definition: 'Present or appearing everywhere.', collocations: ['ubiquitous technology', 'become ubiquitous'], examples: ['Smartphones have become ubiquitous in modern society.'], synonyms: ['widespread', 'pervasive', 'omnipresent'] },
    { word: 'Innovation', ipa: '/ˌɪnəˈveɪʃən/', definition: 'A new idea, method, or technology.', collocations: ['technological innovation', 'drive innovation'], examples: ['Investment can drive innovation in renewable energy.'], synonyms: ['advancement', 'breakthrough'] },
    { word: 'Automation', ipa: '/ˌɔːtəˈmeɪʃən/', definition: 'The use of technology to operate processes with little human involvement.', collocations: ['workplace automation', 'automation technology'], examples: ['Automation may transform repetitive jobs in the future.'], synonyms: ['mechanisation', 'computerisation'] },
  ],
};

export async function generateVocabularyByTopicAction(topic: string): Promise<GeneratedVocabulary[]> {
  const normalizedTopic = topic.trim().toLowerCase();
  if (!normalizedTopic) throw new Error('Please enter a topic.');
  if (normalizedTopic.length > 100) throw new Error('Topic is too long.');

  const matchedTopic = Object.keys(topicWordSets).find((key) => normalizedTopic.includes(key));
  if (matchedTopic) return topicWordSets[matchedTopic];

  return [
    { word: 'Prevalent', ipa: '/ˈprevələnt/', definition: `Common or widespread in discussions about ${topic.trim()}.`, collocations: ['increasingly prevalent', 'be prevalent in society'], examples: [`This issue is increasingly prevalent in discussions about ${topic.trim()}.`], synonyms: ['common', 'widespread', 'dominant'] },
    { word: 'Compelling', ipa: '/kəmˈpelɪŋ/', definition: 'Very convincing or interesting.', collocations: ['compelling argument', 'compelling evidence'], examples: [`There is compelling evidence that ${topic.trim()} deserves public attention.`], synonyms: ['persuasive', 'convincing'] },
    { word: 'Implication', ipa: '/ˌɪmplɪˈkeɪʃən/', definition: 'A likely effect or consequence of an action or decision.', collocations: ['long-term implication', 'social implications'], examples: [`Policymakers should consider the long-term implications of ${topic.trim()}.`], synonyms: ['consequence', 'effect', 'ramification'] },
  ];
}

export type GeneratedVocabularyCard = GeneratedVocabulary & {
  vietnameseMeaning: string;
  partOfSpeech: string;
  topic: string;
};

export async function generateVocabularyCardAction(word: string, apiKey?: string): Promise<GeneratedVocabularyCard> {
  await authorizeAIAction('vocabulary_card');
  word = requireText(word, 'Word', 120);
  const fallback: GeneratedVocabularyCard = {
    word, ipa: '', definition: `An academic English word or phrase: ${word}.`, vietnameseMeaning: 'Cần AI để giải thích chính xác theo từ đã nhập.', partOfSpeech: 'Chưa phân loại', topic: 'Personal vocabulary', collocations: [`use ${word} in context`], examples: [`This is an example sentence using ${word}.`], synonyms: [],
  };
  if (!apiKey && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) return fallback;
  const response = await getAIChatResponse({ apiKeyOverride: apiKey, temperature: 0.25, jsonMode: true, messages: [
    { role: 'system', content: 'You create accurate IELTS vocabulary cards. Return valid JSON only with word, ipa, definition, vietnameseMeaning, partOfSpeech, topic, collocations (2-4), examples (1-2), and synonyms (2-4). Explain the submitted English word or short phrase. Use concise learner-friendly English and Vietnamese.' },
    { role: 'user', content: `Create one complete IELTS vocabulary card for: ${word}` },
  ] });
  try {
    const value = JSON.parse(response) as Partial<GeneratedVocabularyCard>;
    if (typeof value.definition !== 'string' || typeof value.vietnameseMeaning !== 'string' || typeof value.partOfSpeech !== 'string' || typeof value.topic !== 'string' || !Array.isArray(value.collocations) || !Array.isArray(value.examples) || !Array.isArray(value.synonyms)) throw new Error('Invalid vocabulary card.');
    return { word: typeof value.word === 'string' && value.word.trim() ? value.word.trim().slice(0, 120) : word, ipa: typeof value.ipa === 'string' ? value.ipa.slice(0, 120) : '', definition: value.definition.slice(0, 500), vietnameseMeaning: value.vietnameseMeaning.slice(0, 300), partOfSpeech: value.partOfSpeech.slice(0, 100), topic: value.topic.slice(0, 100), collocations: value.collocations.slice(0, 4).map(item => String(item).slice(0, 120)), examples: value.examples.slice(0, 2).map(item => String(item).slice(0, 500)), synonyms: value.synonyms.slice(0, 4).map(item => String(item).slice(0, 120)) };
  } catch (error) { console.error('Unable to parse generated vocabulary card:', error); throw new Error('AI could not create this vocabulary card. Please try again.'); }
}

export type ReadingWordExplanation = {
  word: string;
  vietnameseMeaning: string;
  definition: string;
  partOfSpeech: string;
  topic: string;
  collocations: string[];
  example: string;
};

const readingWordFallbacks: Record<string, Omit<ReadingWordExplanation, 'word'>> = {
  infrastructure: { vietnameseMeaning: 'cơ sở hạ tầng', definition: 'The basic systems and structures needed for a society or organisation to operate.', partOfSpeech: 'noun', topic: 'Housing & Cities', collocations: ['urban infrastructure', 'public infrastructure'], example: 'A reliable transport network is essential infrastructure for a growing city.' },
  canopy: { vietnameseMeaning: 'tán cây', definition: 'The upper layer of branches and leaves formed by trees.', partOfSpeech: 'noun', topic: 'Environment', collocations: ['tree canopy', 'urban canopy'], example: 'A dense tree canopy can lower temperatures in city streets.' },
  absorbing: { vietnameseMeaning: 'hấp thụ', definition: 'Taking in a substance, energy, or information.', partOfSpeech: 'verb', topic: 'Environment', collocations: ['absorbing carbon dioxide', 'absorb heat'], example: 'Trees are capable of absorbing carbon dioxide from the air.' },
  drainage: { vietnameseMeaning: 'hệ thống thoát nước', definition: 'The removal of excess water through natural or built systems.', partOfSpeech: 'noun', topic: 'Housing & Cities', collocations: ['drainage system', 'urban drainage'], example: 'Heavy rain can put pressure on a city’s drainage system.' },
  compacted: { vietnameseMeaning: 'bị nén chặt', definition: 'Pressed into a smaller, denser form.', partOfSpeech: 'adjective', topic: 'Environment', collocations: ['compacted soil', 'highly compacted'], example: 'Roots cannot grow easily in compacted soil.' },
  participation: { vietnameseMeaning: 'sự tham gia', definition: 'The act of taking part in an activity or process.', partOfSpeech: 'noun', topic: 'Culture & Society', collocations: ['community participation', 'public participation'], example: 'Community participation improves the long-term success of local projects.' },
};

export async function explainReadingWordAction(word: string, context: string, apiKey?: string): Promise<ReadingWordExplanation> {
  await authorizeAIAction('reading_word_explanation');
  word = requireText(word, 'Word', 80).replace(/[^\p{L}\s'-]/gu, '').replace(/\s+/g, ' ').trim();
  context = requireText(context, 'Context', 2_000);
  const fallback = readingWordFallbacks[word.toLowerCase()] || {
    vietnameseMeaning: 'Từ vựng học thuật trong ngữ cảnh bài đọc', definition: `A useful academic word used in the context: “${context.slice(0, 120)}”.`, partOfSpeech: 'word class needs AI review', topic: 'Academic Reading', collocations: [`use ${word} in context`], example: context,
  };
  if (!apiKey && !process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) return { word, ...fallback };
  const response = await getAIChatResponse({ apiKeyOverride: apiKey, temperature: 0.2, jsonMode: true, messages: [
    { role: 'system', content: 'You are an IELTS vocabulary teacher. Explain the selected English word strictly in its passage context. Return valid JSON only with vietnameseMeaning, definition, partOfSpeech, topic, collocations (2 short strings), and example. topic must be a concise IELTS topic category. Do not use markdown.' },
    { role: 'user', content: `Word: ${word}\nPassage context: ${context}` },
  ] });
  try {
    const value = JSON.parse(response) as Partial<Omit<ReadingWordExplanation, 'word'>>;
    if (typeof value.vietnameseMeaning !== 'string' || typeof value.definition !== 'string' || typeof value.partOfSpeech !== 'string' || typeof value.topic !== 'string' || !Array.isArray(value.collocations) || typeof value.example !== 'string') throw new Error('Invalid AI word explanation.');
    return { word, vietnameseMeaning: value.vietnameseMeaning.slice(0, 240), definition: value.definition.slice(0, 500), partOfSpeech: value.partOfSpeech.slice(0, 80), topic: value.topic.slice(0, 80), collocations: value.collocations.slice(0, 4).map(item => String(item).slice(0, 100)), example: value.example.slice(0, 500) };
  } catch (error) { console.error('Unable to parse word explanation:', error); throw new Error('AI could not explain this word. Please try again.'); }
}

/**
 * AI Tutor chat server action
 */
export async function sendTutorMessage(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const auth = await authorizeAIAction('tutor');
  userMessage = requireText(userMessage, 'Message', 4_000);
  history = history.slice(-20).map(message => ({ ...message, content: message.content.slice(0, 4_000) }));
  const hasKeys = !!process.env.DEEPSEEK_API_KEY || !!process.env.OPENAI_API_KEY;

  if (!hasKeys) {
    // Return structured mock response for tutor
    return `### Grammar & Vocabulary Explanation

Your query about **"${userMessage.substring(0, 30)}..."** is a great IELTS focus!

1. **Academic Vocabulary Choice:**
   - Instead of using simple words, try **"ameliorate"** (to make something better) or **"detrimental"** (harmful).
   - *Example:* "Government policies should focus on *ameliorating* air pollution in cities."

2. **IELTS Grammar Tip:**
   - To achieve Band 7.0+, you must use **complex sentences**. Combine two clauses using subordinating conjunctions like *although*, *whereas*, or *since*.
   - *Example:* "Whereas some people argue that tech isolates us, others believe it strengthens global bonds."

Would you like me to write a full model answer or check a sentence for you?`;
  }

  try {
    const response = await getTutorResponse(userMessage, history);
    if (auth) {
      let { data: session } = await auth.supabase.from('chat_sessions').select('id')
        .eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!session) {
        const created = await auth.supabase.from('chat_sessions').insert({
          user_id: auth.user.id, title: userMessage.slice(0, 80),
        }).select('id').single();
        session = created.data;
      }
      if (session) {
        const { error } = await auth.supabase.from('chat_messages').insert([
          { session_id: session.id, sender: 'user', content: userMessage },
          { session_id: session.id, sender: 'assistant', content: response },
        ]);
        if (error) console.error('Unable to save tutor history:', error.message);
      }
    }
    await awardActivity(auth, 'tutor_message');
    return response;
  } catch (err: unknown) {
    console.error('Tutor Action Error:', err);
    const message = err instanceof Error ? err.message : 'AI API error';
    return `I apologize, I encountered an issue: ${message}. Please try again shortly.`;
  }
}

/**
 * Writing evaluation server action
 */
export async function evaluateEssayAction(
  prompt: string,
  essay: string,
  apiKey?: string
): Promise<WritingEvaluation> {
  const auth = await authorizeAIAction('writing_evaluation');
  prompt = requireText(prompt, 'Prompt', 2_000);
  essay = requireText(essay, 'Essay', 20_000);
  const hasKeys = !!apiKey || !!process.env.DEEPSEEK_API_KEY || !!process.env.OPENAI_API_KEY;

  if (!hasKeys) {
    // Return mock Writing Evaluation
    return {
      estimatedBand: 6.5,
      taskAchievement: 6.0,
      coherenceCohesion: 6.5,
      lexicalResource: 7.0,
      grammarAccuracy: 6.5,
      strengths: [
        'Clear and relevant thesis statement outlining both perspectives.',
        'Strong use of academic terms (e.g. "prevalent", "deleterious", "mitigate").'
      ],
      weaknesses: [
        'Lack of clear supporting examples in body paragraph 1.',
        'Minor subject-verb agreement errors in the conclusion.'
      ],
      suggestedImprovements: [
        'Add a specific historical or local example in paragraph 1 to back up your claim.',
        'Proofread verb forms in complex conditional structures.'
      ],
      improvedVersion: `Here is a band 8.5+ revised structure:

In contemporary society, the debate surrounding modern technology and its impact on personal relationships remains highly contentious. [Prompt: ${prompt.substring(0, 50)}...] 

While some critics argue that digital communication isolates individuals, I believe that technological integration ultimately enhances global connectivity by bridging geographical distance. A primary strength of instant messaging is the mitigation of border barriers...`
      , paragraphFeedback: [
        { label: 'Introduction', strength: 'Clear position', priority: 'State both views more explicitly.', suggestion: 'Add one sentence that previews both body paragraphs.' },
        { label: 'Body paragraphs', strength: 'Relevant ideas', priority: 'Develop examples further.', suggestion: 'Add a specific consequence or case for each main claim.' },
        { label: 'Conclusion', strength: 'Position is consistent', priority: 'Use more precise summary language.', suggestion: 'Restate the judgement without adding a new idea.' }
      ], checklist: ['Add one specific example to each body paragraph.', 'Check topic sentences directly answer the prompt.', 'Proofread subject–verb agreement.'], bandRationale: 'Your organisation is clear, but development and accuracy need to be more consistent for Band 7.', focusCriterion: 'Task Response'
    };
  }

  const result = await evaluateEssay(prompt, essay, apiKey);
  if (auth) {
    const { data: savedEssay, error: essayError } = await auth.supabase.from('essays').insert({
      user_id: auth.user.id, title: prompt.slice(0, 120), prompt, content: essay,
      status: 'submitted', word_count: essay.split(/\s+/).length, submitted_at: new Date().toISOString(),
    }).select('id').single();
    if (essayError) console.error('Unable to save essay:', essayError.message);
    else {
      const { error } = await auth.supabase.from('essay_feedback').insert({
        essay_id: savedEssay.id, estimated_band: result.estimatedBand,
        task_achievement_score: result.taskAchievement,
        coherence_cohesion_score: result.coherenceCohesion,
        lexical_resource_score: result.lexicalResource,
        grammar_accuracy_score: result.grammarAccuracy,
        strengths: result.strengths, weaknesses: result.weaknesses,
        suggested_improvements: result.suggestedImprovements,
        improved_content: result.improvedVersion,
        paragraph_feedback: result.paragraphFeedback || [], checklist: result.checklist || [],
        band_rationale: result.bandRationale, focus_criterion: result.focusCriterion,
      });
      if (error) console.error('Unable to save essay feedback:', error.message);
    }
  }
  await awardActivity(auth, 'writing_evaluation');
  return result;
}

/**
 * Speaking evaluation server action
 */
export async function evaluateSpeakingAction(
  topic: string,
  transcript: string
): Promise<SpeakingEvaluation> {
  const auth = await authorizeAIAction('speaking_evaluation');
  topic = requireText(topic, 'Topic', 500);
  transcript = requireText(transcript, 'Transcript', 20_000);
  const hasKeys = !!process.env.DEEPSEEK_API_KEY || !!process.env.OPENAI_API_KEY;

  if (!hasKeys) {
    // Return mock Speaking Evaluation
    return {
      estimatedBand: 6.0,
      fluencyScore: 6.0,
      pronunciationScore: null,
      vocabularyScore: 6.5,
      grammarScore: 6.0,
      detailedFeedback: `You responded well to the topic: "${topic}". Your pacing was adequate, but you had noticeable pauses when looking for lexical items. Vocabulary range was strong, though some terms were repetitive.`,
      suggestedImprovements: [
        'Practice transition markers such as "Consequently" or "From my perspective" to bridge ideas smoothly.',
        'Work on the pronunciation of consonant clusters.'
      ]
    };
  }

  const result = await evaluateSpeaking(topic, transcript);
  if (auth) {
    const { data: record, error: recordError } = await auth.supabase.from('speaking_records').insert({
      user_id: auth.user.id, topic, audio_url: 'not-retained', transcript,
    }).select('id').single();
    if (recordError) console.error('Unable to save speaking attempt:', recordError.message);
    else {
      const { error } = await auth.supabase.from('speaking_feedback').insert({
        speaking_record_id: record.id, estimated_band: result.estimatedBand,
        fluency_score: result.fluencyScore, pronunciation_score: result.pronunciationScore,
        vocabulary_score: result.vocabularyScore, grammar_score: result.grammarScore,
        detailed_feedback: result.detailedFeedback, suggested_improvements: result.suggestedImprovements,
      });
      if (error) console.error('Unable to save speaking feedback:', error.message);
    }
  }
  await awardActivity(auth, 'speaking_evaluation');
  return result;
}

export async function transcribeAudioAction(audioBlob: Blob): Promise<string> {
  await authorizeAIAction('transcription');
  if (!audioBlob.size) throw new Error('The recording is empty.');
  if (audioBlob.size > 15 * 1024 * 1024) throw new Error('The recording must be smaller than 15 MB.');
  return transcribeAudio(audioBlob);
}

export async function completeActivityAction(
  type: 'mock_test' | 'daily_task',
  eventKey: string,
) {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasSupabase) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const { data, error } = await supabase.rpc('award_activity', {
    p_event_key: requireText(eventKey, 'Event key', 100), p_activity_type: type,
  });
  if (error) throw new Error('Unable to record activity.');
  return Array.isArray(data) ? data[0] : data;
}

export async function getTutorHistoryAction() {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasSupabase) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const { data: session } = await supabase.from('chat_sessions').select('id')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!session) return [];
  const { data, error } = await supabase.from('chat_messages').select('sender,content')
    .eq('session_id', session.id).order('created_at').limit(100);
  if (error) throw new Error('Unable to load tutor history.');
  return (data || []).map(item => ({ role: item.sender as 'user' | 'assistant', content: item.content }));
}

export async function clearTutorHistoryAction() {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasSupabase) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in.');
  const { error } = await supabase.from('chat_sessions').delete().eq('user_id', user.id);
  if (error) throw new Error('Unable to clear tutor history.');
}

const readingAnswers: Record<string, string> = {
  q1: 'B', q2: 'True', q3: 'Not Given', q4: 'False',
  q5: 'ii', q6: 'iv', q7: 'rainwater', q8: 'community participation',
};

export async function submitReadingAttemptAction(
  answers: Record<string, string>,
  elapsedSeconds: number,
  eventKey: string,
  answerKey: Record<string, string> = readingAnswers,
) {
  const validAnswerKey = Object.fromEntries(
    Object.entries(answerKey).filter(([key, value]) => /^q[1-8]$/.test(key) && typeof value === 'string').map(([key, value]) => [key, value.slice(0, 100)]),
  );
  if (Object.keys(validAnswerKey).length !== 8) throw new Error('Reading practice answer key is invalid.');
  const cleanAnswers = Object.fromEntries(
    Object.entries(answers).filter(([key, value]) => key in validAnswerKey && typeof value === 'string').map(([key, value]) => [key, value.slice(0, 100)]),
  );
  const score = Object.entries(validAnswerKey).reduce((total, [key, answer]) => total + Number(cleanAnswers[key]?.trim().toLowerCase() === answer.toLowerCase()), 0);
  const band = score === 8 ? 8 : score === 7 ? 7.5 : score === 6 ? 7 : score === 5 ? 6.5 : score === 4 ? 6 : score >= 2 ? 5 : 4;
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (hasSupabase) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be signed in.');
    const { error } = await supabase.from('test_results').insert({
      user_id: user.id, reading_band: band, overall_band: band, answers: cleanAnswers,
      feedback: { score, total: 8, elapsed_seconds: Math.max(0, Math.min(3600, Math.round(elapsedSeconds))), passage: 'Urban forests' },
    });
    if (error) throw new Error('Unable to save your Reading result.');
    const award = await supabase.rpc('award_activity', {
      p_event_key: requireText(eventKey, 'Event key', 100), p_activity_type: 'reading_practice',
    });
    if (award.error) console.error('Unable to award Reading XP:', award.error.message);
  }
  return { score, total: 8, band };
}
