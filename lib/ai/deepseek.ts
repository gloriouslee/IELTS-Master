/**
 * DeepSeek & OpenAI API Client wrapper
 */
export async function getAIChatResponse({
  messages,
  temperature = 0.7,
  jsonMode = false,
  apiKeyOverride,
}: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  jsonMode?: boolean;
  apiKeyOverride?: string;
}) {
  const deepseekApiKey = apiKeyOverride || process.env.DEEPSEEK_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!deepseekApiKey && !openaiApiKey) {
    throw new Error('Missing AI API Keys. Please define DEEPSEEK_API_KEY or OPENAI_API_KEY.');
  }

  // Use DeepSeek if available, otherwise fallback to OpenAI
  const isDeepSeek = !!deepseekApiKey;
  const apiKey = isDeepSeek ? deepseekApiKey : openaiApiKey;
  const baseUrl = isDeepSeek ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
  const model = isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`AI API Error (${model}):`, errorData);
    throw new Error(`AI API failed with status ${response.status}.`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}
