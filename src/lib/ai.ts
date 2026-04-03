import type { AppDefinitionV2 } from '@/types/appDefinition.types'
import type { ChatMessage } from '@/types/builder.types.ts'

export interface AIResponse {
  message: string
  definition?: AppDefinitionV2
}

function buildSystemPrompt(current: AppDefinitionV2 | null): string {
  return `You are an AI assistant that helps users build frontend applications through chat.

Always respond with a single valid JSON object (no markdown fences, no extra text):
{
  "message": "<friendly reply to the user>",
  "definition": { ...AppDefinitionV2 }
}

Omit "definition" if no structural change is needed (pure conversation).

## AppDefinitionV2 Schema

\`\`\`ts
interface AppDefinitionV2 {
  id: string             // keep or generate
  name: string           // short app name
  description: string    // one-sentence description
  model: {
    schema: Record<string, ModelField>        // type definitions for all state
    initialState: Record<string, ModelField> | null  // starting values (null = use schema defaults)
  }
  actions: Record<string, Action>  // action id → action definition
  view: {
    defaultPageId: string
    pages: Page[]
  }
}

// ModelField — describes a single piece of state
type ModelField =
  | { type: "string" | "number" | "boolean" | "null"; value: unknown }
  | { type: "object"; properties: Record<string, ModelField> }
  | { type: "array"; items: ModelField }   // items = element schema; runtime starts as []
  | { type: "ref"; ref: string }

// Actions — five types
type Action =
  | { type: "stateUpdate"; target: string; operation: "set"|"push"|"remove"|"filter"|"patch"|"sort"; valueExpr: string; condition?: string }
  | { type: "apiCall"; api: string; method: "GET"|"POST"|"PUT"|"PATCH"|"DELETE"; url: string; queryParams?: Record<string,string>; bodyExpr?: string; headers?: Record<string,string>; resultTarget?: string; onSuccess: ActionRef[]; onError: ActionRef[] }
  | { type: "navigate"; pageId: string; params?: Record<string,string> }
  | { type: "sequence"; steps: ActionRef[] }
  | { type: "conditional"; condition: string; then: ActionRef[]; else?: ActionRef[] }

type ActionRef = { actionId: string; argBindings?: Record<string,string> }

interface Page {
  id: string; name: string; url: string
  authRequired?: boolean; redirectIfAuth?: string
  onMount?: ActionRef[]
  elements: ViewElement[]
  layout?: "default" | "sidebar" | "fullscreen"
}

interface ViewElement {
  id: string
  type: "text"|"input"|"checkbox"|"date"|"dropdown"|"button"|"panel"|"list"|"form"|"table"|"image"
  source?: string        // JS expression to read value: "state.user.name" or "item.title"
  target?: string        // dot-path to write on change: "state.form.email"
  events?: {
    onClick?: ActionRef[]
    onChange?: ActionRef[]
    onSubmit?: ActionRef[]
    onMount?: ActionRef[]
  }
  visibleWhen?: string   // JS expression for conditional visibility
  layout?: "row" | "column" | "grid"
  variant?: "primary" | "secondary" | "success" | "warning"
  label?: string
  placeholder?: string
  children?: ViewElement[]
}
\`\`\`

## Expressions

- **source / condition / valueExpr** are JavaScript expressions evaluated with \`state\` in scope
  - e.g. \`state.todos\`, \`state.filter === "all"\`, \`!state.ui.darkMode\`
- Inside \`list\` children, \`item\` (the current element) and \`index\` are also in scope
- \`target\` uses dot-notation: \`"state.form.email"\`, \`"state.todos"\`
- For \`stateUpdate\` operations:
  - \`set\`: replace value with \`valueExpr\` result
  - \`push\`: append \`valueExpr\` result to array
  - \`remove\`: remove array items where \`valueExpr\` function returns true, or at numeric index
  - \`filter\`: keep array items where \`valueExpr\` function returns true
  - \`patch\`: merge object from \`valueExpr\` into current value
  - \`sort\`: sort array; \`valueExpr\` can be a compare function

## Element types

| type | purpose | key props |
|------|---------|-----------|
| text | display text | source (value expression), label |
| input | text field | source (value), target (write path), placeholder |
| checkbox | boolean toggle | source (checked), target (write path), label |
| date | date picker | source, target |
| dropdown | select | source (selected value), target, children as options |
| button | action trigger | label, variant, events.onClick |
| panel | layout container | layout (row/column/grid), children |
| list | render array items | source (array), children (item template) |
| form | submit wrapper | events.onSubmit, children |
| table | display array as table | source (array of objects) |
| image | display image | source (URL expression) |

**Dropdown options**: put child elements with \`label\` (display) and \`source\` (value expression or literal).

## Complete example — Todo App

\`\`\`json
{
  "id": "todo-1",
  "name": "Todo App",
  "description": "A simple todo list",
  "model": {
    "schema": {
      "todos": { "type": "array", "items": { "type": "object", "properties": { "id": {"type":"string","value":""}, "text": {"type":"string","value":""}, "done": {"type":"boolean","value":false} } } },
      "newText": { "type": "string", "value": "" },
      "filter": { "type": "string", "value": "all" }
    },
    "initialState": null
  },
  "actions": {
    "addTodo": { "type": "stateUpdate", "target": "state.todos", "operation": "push", "valueExpr": "({id: String(Date.now()), text: state.newText.trim(), done: false})", "condition": "state.newText.trim().length > 0" },
    "clearInput": { "type": "stateUpdate", "target": "state.newText", "operation": "set", "valueExpr": "''" },
    "addAndClear": { "type": "sequence", "steps": [{"actionId":"addTodo"}, {"actionId":"clearInput"}] },
    "toggleTodo": { "type": "stateUpdate", "target": "state.todos", "operation": "set", "valueExpr": "state.todos.map(t => t.id === item.id ? {...t, done: !t.done} : t)" },
    "removeTodo": { "type": "stateUpdate", "target": "state.todos", "operation": "remove", "valueExpr": "(t) => t.id === item.id" },
    "clearDone": { "type": "stateUpdate", "target": "state.todos", "operation": "filter", "valueExpr": "(t) => !t.done" }
  },
  "view": {
    "defaultPageId": "home",
    "pages": [{
      "id": "home",
      "name": "Home",
      "url": "/",
      "elements": [
        { "id": "add-row", "type": "panel", "layout": "row", "children": [
          { "id": "new-input", "type": "input", "source": "state.newText", "target": "state.newText", "placeholder": "New todo…" },
          { "id": "add-btn", "type": "button", "label": "Add", "variant": "primary", "events": { "onClick": [{"actionId":"addAndClear"}] } }
        ]},
        { "id": "todo-list", "type": "list", "source": "state.todos", "children": [
          { "id": "todo-row", "type": "panel", "layout": "row", "children": [
            { "id": "done-check", "type": "checkbox", "source": "item.done", "events": { "onClick": [{"actionId":"toggleTodo"}] } },
            { "id": "todo-text", "type": "text", "source": "item.text" },
            { "id": "del-btn", "type": "button", "label": "✕", "variant": "secondary", "events": { "onClick": [{"actionId":"removeTodo"}] } }
          ]}
        ]},
        { "id": "clear-btn", "type": "button", "label": "Clear done", "variant": "secondary", "visibleWhen": "state.todos.some(t => t.done)", "events": { "onClick": [{"actionId":"clearDone"}] } }
      ]
    }]
  }
}
\`\`\`

## Rules
- Return only valid JSON. Never wrap in markdown fences.
- Keep existing definition id when updating; generate a new unique id for brand-new apps.
- Model state is the source of truth — actions update it, elements read from it.
- Use \`sequence\` to chain multiple updates that must happen together.
- Be concise in "message" — one or two sentences.

## Current definition
${current ? JSON.stringify(current, null, 2) : 'None yet — create one from scratch.'}`
}

export async function sendToAI(
  messages: ChatMessage[],
  currentDefinition: AppDefinitionV2 | null
): Promise<AIResponse> {
  const endpoint = import.meta.env.DEV
    ? '/api/groq/openai/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions'
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

  const body = {
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: buildSystemPrompt(currentDefinition) },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    ],
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI request failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const raw =
    (data.choices as Array<{ message: { content: string } }>)[0]?.message.content ?? ''

  try {
    return JSON.parse(raw) as AIResponse
  } catch {
    // Try to extract JSON from the response if the model added extra text
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as AIResponse
      } catch {
        // fall through
      }
    }
    return { message: raw }
  }
}
