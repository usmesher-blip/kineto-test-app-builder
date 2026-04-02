import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useChat } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

export function ChatPanel() {
  const { messages, isGenerating, sendMessage } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isGenerating) return
    setInput('')
    sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-800 text-sm">
        Chat
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Describe the app you want to build…
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isGenerating && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] max-h-[120px]"
            placeholder="Describe changes… (Enter to send)"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
          />
          <button
            onClick={handleSend}
            disabled={isGenerating || !input.trim()}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isGenerating || !input.trim()
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            )}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
