import { useState } from 'react'
import { useStore } from '@nanostores/react'
import clsx from 'clsx'
import { $currentDefinition, $history, $canUndo, builderActions } from '@/store/builder.store.ts'
import { AppRenderer } from './AppRenderer'
import { AppDefinitionPanel } from '@/components/AppDefinition/AppDefinitionPanel'
import { ChevronRight, Layers } from 'lucide-react'

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function PreviewPanel() {
  const definition = useStore($currentDefinition)
  const history = useStore($history)
  const canUndo = useStore($canUndo)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState<'definition' | 'history'>('history')

  const isEmpty =
    !definition ||
    definition.view.pages.every((p) => p.elements.length === 0)

  const currentSnapshotId = history.at(-1)?.id
  const snapshotCount = history.length

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* Main preview area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Your app preview will appear here.
          </div>
        ) : (
          <AppRenderer definition={definition!} />
        )}
      </div>

      {/* Snapshot counter trigger — top-right of preview */}
      <button
        onClick={() => setDrawerOpen((o) => !o)}
        title="Open definition & history"
        className={clsx(
          'absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm border',
          drawerOpen
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        )}
      >
        <Layers size={13} />
        <span>
          {snapshotCount} snapshot{snapshotCount !== 1 ? 's' : ''}
        </span>
        {canUndo && (
          <span className={clsx(
            'ml-0.5 text-xs',
            drawerOpen ? 'text-blue-200' : 'text-gray-400'
          )}>
            · undo
          </span>
        )}
      </button>

      {/* Sliding drawer — full height, contains definition + history */}
      <div
        className={clsx(
          'absolute top-0 right-0 h-full z-10 flex flex-col bg-white border-l border-gray-200 shadow-xl transition-all duration-300 overflow-hidden',
          drawerOpen ? 'w-80' : 'w-0'
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0 bg-white">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('history')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === 'history'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              History
            </button>
            <button
              onClick={() => setTab('definition')}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                tab === 'definition'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              Definition
            </button>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* History tab */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto py-1">
            {[...history].reverse().map((snapshot, i) => {
              const isCurrent = snapshot.id === currentSnapshotId
              const isOldest = i === history.length - 1
              return (
                <button
                  key={snapshot.id}
                  onClick={() => builderActions.jumpTo(snapshot.id)}
                  disabled={isCurrent}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors border-b border-gray-50 last:border-0',
                    isCurrent
                      ? 'bg-blue-50 cursor-default'
                      : 'hover:bg-gray-50 cursor-pointer'
                  )}
                >
                  <span className={clsx(
                    'text-xs font-medium truncate',
                    isCurrent ? 'text-blue-700' : 'text-gray-700'
                  )}>
                    {isCurrent && <span className="mr-1 text-blue-500">▸</span>}
                    {snapshot.label}
                    {isOldest && !isCurrent && (
                      <span className="ml-1 text-gray-400 font-normal">(initial)</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(snapshot.timestamp)}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Definition tab */}
        {tab === 'definition' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <AppDefinitionPanel />
          </div>
        )}
      </div>

      {/* Backdrop to close on mobile */}
      {drawerOpen && (
        <div
          className="absolute inset-0 z-0 sm:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
    </div>
  )
}
