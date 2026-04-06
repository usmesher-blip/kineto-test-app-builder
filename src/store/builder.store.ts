import { atom, computed } from 'nanostores';
import type { AppDefinition } from '@/types/appDefinition.types';
import type { ChatMessage, Snapshot } from '@/types/builder.types.ts';
import { nanoid } from '@/utils/nanoid';

const STORAGE_HISTORY = 'kineto-history';
const STORAGE_MESSAGES = 'kineto-messages';
const STORAGE_CURRENT_INDEX = 'kineto-current-index';

const EMPTY_DEFINITION: AppDefinition = {
  id: 'default',
  name: 'My App',
  description: '',
  model: {
    schema: {},
    initialState: null,
  },
  actions: {},
  view: {
    defaultPageId: 'home',
    pages: [
      {
        id: 'home',
        name: 'Home',
        url: '/',
        elements: [],
      },
    ],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

export const $history = atom<Snapshot[]>(loadJSON(STORAGE_HISTORY, []));
export const $messages = atom<ChatMessage[]>(loadJSON(STORAGE_MESSAGES, []));
export const $currentIndex = atom<number>(loadJSON(STORAGE_CURRENT_INDEX, -1));
export const $isGenerating = atom(false);

// Persist to localStorage on every change
$history.subscribe((value) => localStorage.setItem(STORAGE_HISTORY, JSON.stringify(value)));
$messages.subscribe((value) => localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(value)));
$currentIndex.subscribe((value) =>
  localStorage.setItem(STORAGE_CURRENT_INDEX, JSON.stringify(value))
);

// ── Computed ──────────────────────────────────────────────────────────────────

export const $currentDefinition = computed(
  [$history, $currentIndex],
  (history, idx) => {
    if (history.length === 0) return null;
    const i = idx >= 0 && idx < history.length ? idx : history.length - 1;
    return history[i].definition;
  }
);

export const $canUndo = computed($currentIndex, (idx) => idx > 0);

// ── Actions ───────────────────────────────────────────────────────────────────

export const builderActions = {
  applyDefinition(def: AppDefinition, label: string) {
    const snapshot: Snapshot = {
      id: nanoid(),
      timestamp: Date.now(),
      label,
      definition: { ...def, id: nanoid() },
    };
    const history = $history.get();
    const next = [...history, snapshot];
    const trimmed = next.length > 50 ? next.slice(next.length - 50) : next;
    $history.set(trimmed);
    $currentIndex.set(trimmed.length - 1);
  },

  undo() {
    const idx = $currentIndex.get();
    if (idx > 0) {
      $currentIndex.set(idx - 1);
    }
  },

  jumpTo(snapshotId: string) {
    const history = $history.get();
    const idx = history.findIndex((s) => s.id === snapshotId);
    if (idx !== -1) {
      $currentIndex.set(idx);
    }
  },

  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    $messages.set([...$messages.get(), { ...msg, id: nanoid(), timestamp: Date.now() }]);
  },

  clearMessages() {
    $messages.set([]);
  },

  setGenerating(v: boolean) {
    $isGenerating.set(v);
  },

  importDefinition(json: string) {
    const def: AppDefinition = JSON.parse(json);
    builderActions.applyDefinition(def, 'Imported definition');
  },

  exportDefinition(): string {
    const def = $currentDefinition.get();
    return def ? JSON.stringify(def, null, 2) : '{}';
  },

  reset() {
    $history.set([]);
    $messages.set([]);
    $currentIndex.set(-1);
    $isGenerating.set(false);
    builderActions.applyDefinition(EMPTY_DEFINITION, 'Initial app');
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────

if ($history.get().length === 0) {
  builderActions.applyDefinition(EMPTY_DEFINITION, 'Initial app');
} else {
  // Clamp persisted index to valid range after reload
  const history = $history.get();
  const idx = $currentIndex.get();
  if (idx < 0 || idx >= history.length) {
    $currentIndex.set(history.length - 1);
  }
}
