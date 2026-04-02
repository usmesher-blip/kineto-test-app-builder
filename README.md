# App Builder — Kineto Take-Home

A chat-driven frontend app builder. Describe a mini-app in natural language; watch it come to life in the live preview.

## Live demo

> Deploy to Vercel/Netlify and paste the URL here.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set your Anthropic API key
cp .env.example .env.local
# Edit .env.local and add: VITE_ANTHROPIC_API_KEY=sk-ant-...

# 3. Start dev server
npm run dev
```

Open http://localhost:5173 and start chatting.

---

## Try it

```
"Create a todo list"
"Add a due date field"
"Add a priority selector with Low / Medium / High options"
"Allow filtering by completion status"
"Add dark mode"
"Add a button to clear completed tasks"
```

---

## Architecture

```
src/
├── types/          # AppDefinition schema + store types
├── store/          # Zustand store (history, messages, persistence)
├── lib/
│   └── ai.ts       # Anthropic API wrapper + system prompt
├── hooks/
│   ├── useChat.ts        # Chat orchestration (send → AI → apply)
│   └── usePreviewApp.ts  # Live item state + filter logic
└── components/
    ├── Chat/             # ChatPanel (message list + input)
    ├── Preview/          # PreviewPanel (dynamic field/item renderer)
    └── AppDefinition/    # JSON inspector + import/export/undo
```

### Key decisions

| Decision | Rationale |
|---|---|
| **AppDefinition as data model** | The app is a plain JSON object (`fields`, `filters`, `actions`, `items`). The AI updates it; the Preview renders it. Clear separation of "schema" vs "runtime state". |
| **Zustand + Immer** | Simple, boilerplate-free store. Immer makes immutable history snapshots straightforward. |
| **History as snapshot array** | Each AI response appends a full snapshot. Undo = pop. Simple and debuggable. |
| **AI owns the schema, user owns the items** | The LLM modifies structural fields (what columns/filters exist). Item CRUD is handled locally in the Preview — no AI round-trip needed. |
| **System prompt returns structured JSON** | The model is instructed to always return `{ message, definition? }`. This avoids parsing markdown or free text for structural changes. |
| **localStorage persistence** | `zustand/middleware/persist` serialises history + messages automatically. No backend needed. |
| **No iframe sandbox** | The preview renders React components driven by the definition. This is safer than `eval`-ing generated code but limits expressivity — a deliberate tradeoff for this scope. |

### What's intentionally simplified / not done

- **No auth / key proxy** — the API key is sent from the browser. For a real deployment, proxy through a backend.
- **No streaming** — responses are awaited in full; a streaming UI would feel snappier.
- **No version navigation UI** — undo works but there's no timeline to browse snapshots visually.
- **Single item layout** — items render as a flat row of inputs; cards, tables, or kanban layouts are future work.
- **No real code generation** — the preview is a declarative renderer, not a full code generator. This is intentional for stability.

---

## AI usage

- **Claude (claude-sonnet-4)** powers the chat. It receives the current `AppDefinition` as context and returns a JSON patch.
- The system prompt was designed iteratively to get reliable structured output without markdown fences.
- This project scaffold was built with AI assistance for speed, with manual review of all generated code.

---

## Deployment

```bash
npm run build
# Upload dist/ to Vercel, Netlify, or Cloudflare Pages
```

For Vercel, set `VITE_ANTHROPIC_API_KEY` in Project Settings → Environment Variables.

> ⚠️ Exposing an API key in a Vite app makes it visible in the browser. Fine for a review; not for public production use.
