# Kineto App Builder

A chat-driven frontend app builder. Describe a mini-app in natural language and watch it come to life in a live preview — no code required.

## Live demo

> Deploy to Vercel/Netlify and paste the URL here.

---

## Quick start

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Set your Groq API key
echo "VITE_GROQ_API_KEY=gsk_..." > .env.local

# 3. Start dev server
npm run dev
```

Open http://localhost:5173 and start chatting.

> The dev server proxies `/api/groq → https://api.groq.com`, so the API key stays out of network requests visible in DevTools during local development.

---

## Try it

```
"Create a todo list"
"Add a due date field to each task"
"Add a priority selector with Low / Medium / High options"
"Allow filtering by completion status"
"Add a second page with a summary of completed tasks"
"Add a button to clear completed tasks"
```

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server with HMR |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run lint` | ESLint with TypeScript rules |
| `npm run format` | Prettier format all `src/**/*.{ts,tsx}` |

---

## Architecture

```
src/
├── types/
│   ├── appDefinition.types.ts   # AppDefinition schema (model, actions, view)
│   └── builder.types.ts         # Chat messages, Snapshot
├── store/
│   └── builder.store.ts         # nanostores atoms + history/undo/persist
├── lib/
│   ├── ai.ts                    # Groq API wrapper (llama-3.3-70b-versatile)
│   ├── systemPrompt.ts          # Prompt that instructs the LLM on AppDefinitionV2
│   ├── actionExecutor.ts        # Runtime action dispatcher
│   └── expressionEvaluator.ts   # Safe JS expression evaluator for data binding
├── hooks/
│   ├── useChat.ts               # Chat orchestration: send → AI → apply definition
│   └── useAppRuntime.ts         # Live app state, page navigation, action dispatch
└── components/
    ├── Chat/                    # ChatPanel, MessageBubble, TypingIndicator
    ├── Preview/                 # PreviewPanel, AppRenderer, ViewElementRenderer
    └── AppDefinition/           # JSON inspector, import/export, undo button
```

### Data flow

```
User message
    │
    ▼
useChat  ──►  ai.ts (Groq API, llama-3.3-70b)
                │  returns { message, definition? }
                ▼
         builder.store  (nanostores atom)
            $history[]  ◄── snapshot appended
            $currentDefinition (computed)
                │
                ▼
         PreviewPanel
            useAppRuntime  ── manages runtime state, page nav
                │
                ▼
         AppRenderer / ViewElementRenderer
            ── reads state via expressionEvaluator
            ── fires events → actionExecutor → state update → re-render
```

### AppDefinition schema

Every app is a plain JSON object (`AppDefinition`) that describes three things:

| Section | Purpose |
|---|---|
| `model` | Type schema + initial values for all app state |
| `actions` | Named operations: state updates, API calls, navigation, sequences, conditionals |
| `view` | Pages and element trees that read from state and fire actions |

The LLM receives the current definition as context and returns a full updated definition. The renderer turns it into live React components — no code generation, no eval of generated code.

### Key decisions

| Decision | Rationale |
|---|---|
| **AppDefinition as the single source of truth** | A plain JSON object drives both the AI (context) and the renderer (output). Clear separation of schema vs runtime state. |
| **nanostores** | Minimal, framework-agnostic atoms. `$history` (snapshot array) + `$messages` (chat log) with localStorage persistence via `.subscribe`. |
| **History as snapshot array** | Each AI response appends a full `AppDefinition` snapshot. Undo = pop last entry. Simple and inspectable. |
| **Expression evaluator for data binding** | `source`, `visibleWhen`, `filterExpr`, and `valueExpr` are JS expressions evaluated in a sandboxed context with `state` (and `item`/`index` inside lists) in scope. No eval of LLM-generated code. |
| **actionExecutor is synchronous for state ops** | State updates in a `sequence` are applied to a mutable container so each step sees the previous step's result — then React state is updated once. |
| **Groq proxy in dev** | `vite.config.ts` proxies `/api/groq → https://api.groq.com`. In production builds, the client calls Groq directly with the env var key. |
| **Structured JSON response** | The system prompt instructs the model to always return `{ message, definition? }` with no markdown fences. Malformed responses fall back to text-only. |
| **filterExpr is display-only** | List filtering never mutates state — `filterExpr` hides items in the renderer. The `remove` operation is reserved for intentional destructive deletes. |

### What is intentionally out of scope

- **No auth / key proxy** — the API key is bundled into the browser bundle. For a public deployment, proxy through a backend.
- **No streaming** — responses are awaited in full; a streaming UI would feel snappier.
- **No visual snapshot timeline** — undo works but there is no UI to browse or jump to arbitrary history entries.
- **No real code export** — the preview is a declarative renderer. Generating downloadable React/Vue code is future work.
- **No adaptive layout** - it's pretty straightforward yet not really showing AI related features

### What could be improved with more time invested
- **Api refinement agent** - it's hard to configure the app for external api call with just one agent, we could introduce one more fore reading and refining external api calls
- **More styling features** - configuration could be extended to include more advanced styling features
- **Better prompt and configurability** - with some requests it could go not very well so such refinement could help to get more reasonable output a lot
- **Better UX in terms of LLM errors handling**

---

## Deployment

```bash
npm run build
```