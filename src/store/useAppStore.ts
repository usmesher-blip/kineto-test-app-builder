import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { AppStore, AppDefinition, ChatMessage, Snapshot, AppItem } from '@/types'
import { nanoid } from '@/utils/nanoid'

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

export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      history: [],
      messages: [],
      isGenerating: false,

      // ── Derived ──────────────────────────────────────────────────────────

      currentDefinition: () => {
        const { history } = get()
        return history.length > 0 ? history[history.length - 1].definition : null
      },

      canUndo: () => get().history.length > 1,

      // ── Actions ──────────────────────────────────────────────────────────

      applyDefinition: (def: AppDefinition, label: string) => {
        set((state) => {
          const snapshot: Snapshot = {
            id: nanoid(),
            timestamp: Date.now(),
            label,
            definition: { ...def, id: nanoid() },
          }
          state.history.push(snapshot)
          // Keep history bounded to avoid unbounded localStorage growth
          if (state.history.length > 50) {
            state.history.splice(0, state.history.length - 50)
          }
        })
      },

      undo: () => {
        set((state) => {
          if (state.history.length > 1) {
            state.history.pop()
          }
        })
      },

      addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        set((state) => {
          state.messages.push({
            ...msg,
            id: nanoid(),
            timestamp: Date.now(),
          })
        })
      },

      setGenerating: (v: boolean) => {
        set((state) => {
          state.isGenerating = v
        })
      },

      /** Update only the items list of the current definition (runtime state, not a history entry) */
      updateItems: (items: AppItem[]) => {
        set((state) => {
          const last = state.history[state.history.length - 1]
          if (last) {
            last.definition.items = items
          }
        })
      },

      importDefinition: (json: string) => {
        const def: AppDefinition = JSON.parse(json)
        get().applyDefinition(def, 'Imported definition')
      },

      exportDefinition: () => {
        const def = get().currentDefinition()
        if (!def) return '{}'
        return JSON.stringify(def, null, 2)
      },

      reset: () => {
        set((state) => {
          state.history = []
          state.messages = []
          state.isGenerating = false
        })
        get().applyDefinition(EMPTY_DEFINITION, 'Initial app')
      },
    })),
    {
      name: 'kineto-app-builder',
      storage: createJSONStorage(() => localStorage),
      // Only persist history and messages; isGenerating is transient
      partialize: (s) => ({ history: s.history, messages: s.messages }),
      onRehydrateStorage: () => (state) => {
        // If nothing was persisted yet, seed with an empty definition
        if (state && state.history.length === 0) {
          state.applyDefinition(EMPTY_DEFINITION, 'Initial app')
        }
      },
    }
  )
)
