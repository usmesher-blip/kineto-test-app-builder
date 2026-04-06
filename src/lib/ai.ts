import type { AppDefinition } from '@/types/appDefinition.types';
import type { ChatMessage } from '@/types/builder.types.ts';
import { buildSystemPrompt } from './systemPrompt';

export interface AIResponse {
  message: string;
  definition?: AppDefinition;
}

export async function sendToAI(
  messages: ChatMessage[],
  currentDefinition: AppDefinition | null
): Promise<AIResponse> {
  const endpoint = import.meta.env.DEV
    ? '/api/groq/openai/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

  const body = {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: buildSystemPrompt(currentDefinition) },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const raw = (data.choices as Array<{ message: { content: string } }>)[0]?.message.content ?? '';

  try {
    return JSON.parse(raw) as AIResponse;
  } catch {
    // Try to extract JSON from the response if the model added extra text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as AIResponse;
      } catch {
        // fall through
      }
    }
    return { message: raw };
  }
}
