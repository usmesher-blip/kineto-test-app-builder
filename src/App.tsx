import { useState } from 'react'
import { MessageSquare, Monitor } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '@nanostores/react'
import { $isGenerating } from '@/store/builder.store'
import { ChatPanel } from '@/components/Chat/ChatPanel'
import { PreviewPanel } from '@/components/Preview/PreviewPanel'

type MobileTab = 'chat' | 'preview'

export function App() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const isGenerating = useStore($isGenerating)

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Top bar */}
      <header className="flex-none h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0">
        <span className="font-bold text-gray-900 tracking-tight">App Builder</span>
        <span className="text-gray-300">|</span>
        <span className="hidden sm:block text-xs text-gray-400">Describe your app in the chat →</span>
      </header>

      {/* Desktop layout (md+): side-by-side */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left — Chat */}
        <div className="w-80 flex-none flex flex-col overflow-hidden border-r border-gray-200">
          <ChatPanel />
        </div>

        {/* Center — Live Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none px-4 py-2 border-b border-gray-200 bg-white text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Preview
          </div>
          <div className="flex-1 overflow-hidden">
            <PreviewPanel />
          </div>
        </div>
      </div>

      {/* Mobile layout (<md): single panel + bottom tab bar */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        <div className={clsx('flex-1 overflow-hidden', mobileTab === 'chat' ? 'flex flex-col' : 'hidden')}>
          <ChatPanel />
        </div>
        <div className={clsx('flex-1 overflow-hidden', mobileTab === 'preview' ? 'flex flex-col' : 'hidden')}>
          <PreviewPanel />
        </div>

        {/* Bottom tab bar */}
        <nav className="flex shrink-0 border-t border-gray-200 bg-white">
          <button
            onClick={() => setMobileTab('chat')}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors relative',
              mobileTab === 'chat' ? 'text-blue-600' : 'text-gray-500'
            )}
          >
            <MessageSquare size={20} />
            <span>Chat</span>
            {isGenerating && mobileTab !== 'chat' && (
              <span className="absolute top-2 right-[calc(50%-14px)] w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors',
              mobileTab === 'preview' ? 'text-blue-600' : 'text-gray-500'
            )}
          >
            <Monitor size={20} />
            <span>Preview</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
