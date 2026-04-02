import type { AppDefinition, ChatMessage } from '@/types'

export interface AIResponse {
  message: string
  definition?: AppDefinition
}

/**
 * Builds the system prompt that instructs the LLM how to respond.
 *
 * The model must always reply with valid JSON matching AIResponse:
 *   { message: string, definition?: AppDefinition }
 *
 * `message` is the conversational reply shown in chat.
 * `definition` (optional) is the full updated app definition.
 */
function buildSystemPrompt(current: AppDefinition | null): string {
  return `You are an AI assistant that helps users build simple frontend applications through chat.

When the user describes an app or requests a change, respond with a JSON object:
{
  "message": "<friendly reply to the user>",
  "definition": { ...updatedAppDefinition }
}

If no structural change is needed (e.g. the user is just chatting), omit "definition".

## AppDefinition schema
\`\`\`ts
interface AppDefinition {
  id: string           // keep existing or generate new uuid
  name: string         // short human-readable app name
  description: string  // one-sentence description
  theme: "light" | "dark"
  fields: Field[]      // data fields for each item
  filters: Filter[]    // filter controls shown above the list
  actions: Action[]    // buttons in the toolbar
  items: AppItem[]     // current data items (preserve unless told to clear)
}

interface Field  { id: string; label: string; type: "text"|"number"|"date"|"checkbox"|"select"; placeholder?: string; options?: string[]; required?: boolean }
interface Filter { id: string; label: string; field: string; type: "boolean"|"search"|"select"; options?: string[] }
interface Action { id: string; label: string; type: "add"|"clear-completed"|"clear-all"|"custom"; icon?: string }
interface AppItem { id: string; [fieldId: string]: unknown }
\`\`\`

## Current definition
${current ? JSON.stringify(current, null, 2) : 'None yet — create one from scratch.'}

## Rules
- Always return valid JSON (no markdown fences, no extra text outside the JSON).
- Preserve existing items unless the user explicitly asks to clear data.
- Keep ids stable when updating existing fields/filters/actions; only generate new ids for new elements.
- Be concise in "message" — one or two sentences.`
}

/**
 * Send a chat history + current definition to the AI and get back a response.
 *
 * Currently wired to the Anthropic Messages API.
 * Swap `endpoint` / headers to use OpenAI or any other provider.
 */
export async function sendToAI(
  messages: ChatMessage[],
  currentDefinition: AppDefinition | null
): Promise<AIResponse> {
  const endpoint = 'https://api.anthropic.com/v1/messages'
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: buildSystemPrompt(currentDefinition),
    messages: messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const raw = (data.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')

  try {
    return JSON.parse(raw) as AIResponse
  } catch {
    // Fallback: treat the whole response as a plain message
    return { message: raw }
  }
}
