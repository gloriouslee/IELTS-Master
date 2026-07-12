/**
 * Whisper Speech-to-Text API Client
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY; // Whisper is generally OpenAI-specific

  if (!apiKey) {
    throw new Error('Missing API Key for transcription. Please configure OPENAI_API_KEY.');
  }

  const formData = new FormData();
  // Append the blob as a file
  formData.append('file', audioBlob, 'speaking_record.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper transcription error:', errorText);
    throw new Error(`Whisper transcription failed with status ${response.status}.`);
  }

  const data = await response.json();
  return data.text as string;
}
