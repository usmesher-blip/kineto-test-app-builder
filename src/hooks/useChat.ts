import { useStore } from '@nanostores/react'
import { $messages, $isGenerating, $currentDefinition, builderActions } from '@/store/builder.store.ts'
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

      if (response.definition) {
        builderActions.applyDefinition(response.definition, text)
      }

      builderActions.addMessage({ role: 'assistant', content: response.message })
    } catch (err) {
      builderActions.addMessage({
        role: 'assistant',
        content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    } finally {
      builderActions.setGenerating(false)
    }
  }

  return { messages, isGenerating, sendMessage }
}
