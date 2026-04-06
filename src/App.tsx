import { ChatPanel } from '@/components/Chat/ChatPanel'
import { PreviewPanel } from '@/components/Preview/PreviewPanel'

export function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      {/* Top bar */}
      <header className="flex-none h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <span className="font-bold text-gray-900 tracking-tight">App Builder</span>
        <span className="text-gray-300">|</span>
        <span className="text-xs text-gray-400">Describe your app in the chat →</span>
      </header>

      {/* Main three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
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
    </div>
  )
}
