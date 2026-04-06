import { useStore } from '@nanostores/react'
import { $messages, $isGenerating, $currentDefinition, $history, builderActions } from '@/store/builder.store.ts'
import { sendToAI } from '@/lib/ai'

export function useChat() {
  const messages = useStore($messages)
  const isGenerating = useStore($isGenerating)

  const sendMessage = async (text: string) => {
    if ($isGenerating.get() || !text.trim()) return

    builderActions.addMessage({ role: 'user', content: text })
    builderActions.setGenerating(true)

    try {
      const response = await sendToAI(
        [...$messages.get(), { id: '', timestamp: 0, role: 'user', content: text }],
        $currentDefinition.get()
      )

      let snapshotId: string | undefined
      if (response.definition) {
        builderActions.applyDefinition(response.definition, text)
        const h = $history.get()
        snapshotId = h[h.length - 1]?.id
      }

      builderActions.addMessage({ role: 'assistant', content: response.message, snapshotId })
    } catch (err) {
      builderActions.addMessage({
        role: 'assistant',
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    } finally {
      builderActions.setGenerating(false)
    }
  }

  const clearMessages = () => builderActions.clearMessages()

  return { messages, isGenerating, sendMessage, clearMessages }
}
