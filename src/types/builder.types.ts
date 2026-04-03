import type { AppDefinitionV2 } from '@/types/appDefinition.types'

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
  label: string
  definition: AppDefinitionV2
}
