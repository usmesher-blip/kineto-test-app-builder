import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { sendToAI } from '@/lib/ai'

export function useChat() {
  const { messages, isGenerating, addMessage, applyDefinition, setGenerating, currentDefinition } =
    useAppStore()

  const sendMessage = useCallback(
    async (text: string) => {
      if (isGenerating || !text.trim()) return

      // 1. Optimistically add the user message
      addMessage({ role: 'user', content: text })
      setGenerating(true)

      try {
        // 2. Call AI with full history and current definition
        const response = await sendToAI(
          [...messages, { id: '', timestamp: 0, role: 'user', content: text }],
          currentDefinition()
        )

        // 3. Apply updated definition if the AI returned one
        if (response.definition) {
          applyDefinition(response.definition, text)
        }

        // 4. Add assistant reply to chat
        addMessage({ role: 'assistant', content: response.message })
      } catch (err) {
        addMessage({
          role: 'assistant',
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      } finally {
        setGenerating(false)
      }
    },
    [messages, isGenerating, addMessage, applyDefinition, setGenerating, currentDefinition]
  )

  return { messages, isGenerating, sendMessage }
}
