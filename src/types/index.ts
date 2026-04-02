// ─── App Definition (the "schema" for a generated mini-app) ──────────────────

export type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'select'

export interface Field {
  id: string
  label: string
  type: FieldType
  placeholder?: string
  options?: string[]      // for select fields
  required?: boolean
}

export interface Filter {
  id: string
  label: string
  field: string           // field id to filter on
  type: 'boolean' | 'search' | 'select'
  options?: string[]
}

export interface Action {
  id: string
  label: string
  type: 'add' | 'clear-completed' | 'clear-all' | 'custom'
  icon?: string
}

export interface AppDefinition {
  id: string
  name: string
  description: string
  theme: 'light' | 'dark'
  fields: Field[]
  filters: Filter[]
  actions: Action[]
  items: AppItem[]
}

export interface AppItem {
  id: string
  [fieldId: string]: unknown
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  /** If this message triggered a definition change, stores the resulting snapshot id */
  snapshotId?: string
}

// ─── History / Undo ──────────────────────────────────────────────────────────

export interface Snapshot {
  id: string
  timestamp: number
  label: string           // human-readable description of what changed
  definition: AppDefinition
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface AppStore {
  /** Ordered list of definition snapshots; last entry is current */
  history: Snapshot[]
  messages: ChatMessage[]
  isGenerating: boolean

  // Derived helpers
  currentDefinition: () => AppDefinition | null
  canUndo: () => boolean

  // Actions
  applyDefinition: (def: AppDefinition, label: string) => void
  undo: () => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setGenerating: (v: boolean) => void
  updateItems: (items: AppItem[]) => void
  importDefinition: (json: string) => void
  exportDefinition: () => string
  reset: () => void
}
