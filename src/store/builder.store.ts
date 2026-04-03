import { atom, computed } from 'nanostores'
import type { AppDefinition, ChatMessage, Snapshot, AppItem } from '@/types/builder.types.ts'
import { nanoid } from '@/utils/nanoid'

const STORAGE_HISTORY = 'kineto-history'
const STORAGE_MESSAGES = 'kineto-messages'

const EMPTY_DEFINITION: AppDefinition = {
  id: 'default',
  name: 'My App',
  description: '',
  theme: 'light',
  fields: [],
  filters: [],
  actions: [],
  items: [],
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

export const $history = atom<Snapshot[]>(loadJSON(STORAGE_HISTORY, []))
export const $messages = atom<ChatMessage[]>(loadJSON(STORAGE_MESSAGES, []))
export const $isGenerating = atom(false)

// Persist history and messages to localStorage on every change
$history.subscribe((value) => localStorage.setItem(STORAGE_HISTORY, JSON.stringify(value)))
$messages.subscribe((value) => localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(value)))

// ── Computed ──────────────────────────────────────────────────────────────────

export const $currentDefinition = computed(
  $history,
  (history) => (history.length > 0 ? history[history.length - 1].definition : null)
)

export const $canUndo = computed($history, (history) => history.length > 1)

// ── Actions ───────────────────────────────────────────────────────────────────

export const builderActions = {
  applyDefinition(def: AppDefinition, label: string) {
    const snapshot: Snapshot = {
      id: nanoid(),
      timestamp: Date.now(),
      label,
      definition: { ...def, id: nanoid() },
    }
    const next = [...$history.get(), snapshot]
    $history.set(next.length > 50 ? next.slice(next.length - 50) : next)
  },

  undo() {
    const history = $history.get()
    if (history.length > 1) {
      $history.set(history.slice(0, -1))
    }
  },

  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    $messages.set([...$messages.get(), { ...msg, id: nanoid(), timestamp: Date.now() }])
  },

  setGenerating(v: boolean) {
    $isGenerating.set(v)
  },

  updateItems(items: AppItem[]) {
    const history = $history.get()
    if (history.length === 0) return
    const last = history[history.length - 1]
    $history.set([
      ...history.slice(0, -1),
      { ...last, definition: { ...last.definition, items } },
    ])
  },

  importDefinition(json: string) {
    const def: AppDefinition = JSON.parse(json)
    builderActions.applyDefinition(def, 'Imported definition')
  },

  exportDefinition(): string {
    const def = $currentDefinition.get()
    return def ? JSON.stringify(def, null, 2) : '{}'
  },

  reset() {
    $history.set([])
    $messages.set([])
    $isGenerating.set(false)
    builderActions.applyDefinition(EMPTY_DEFINITION, 'Initial app')
  },
}

// ── Init ──────────────────────────────────────────────────────────────────────

if ($history.get().length === 0) {
  builderActions.applyDefinition(EMPTY_DEFINITION, 'Initial app')
}
