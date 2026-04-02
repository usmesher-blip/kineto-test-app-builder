import { useState } from 'react'
import { Download, Upload, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { IconButton } from './IconButton'

export function AppDefinitionPanel() {
  const { canUndo, undo, exportDefinition, importDefinition, history } = useAppStore()
  const definition = useAppStore((s) => s.currentDefinition())
  const [collapsed, setCollapsed] = useState(false)

  const handleExport = () => {
    const json = exportDefinition()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${definition?.name ?? 'app'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          importDefinition(ev.target?.result as string)
        } catch {
          alert('Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-t border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          App Definition
        </button>

        <div className="flex gap-1">
          <IconButton title="Undo" disabled={!canUndo()} onClick={undo}>
            <RotateCcw size={13} />
          </IconButton>
          <IconButton title="Export JSON" onClick={handleExport}>
            <Download size={13} />
          </IconButton>
          <IconButton title="Import JSON" onClick={handleImport}>
            <Upload size={13} />
          </IconButton>
        </div>
      </div>

      {/* History breadcrumb */}
      {!collapsed && (
        <div className="px-4 py-1.5 text-xs text-gray-400 border-b border-gray-200 bg-white">
          {history.length} snapshot{history.length !== 1 ? 's' : ''} •{' '}
          {canUndo() ? `undo available` : 'no undo'}
        </div>
      )}

      {/* JSON viewer */}
      {!collapsed && (
        <pre className="flex-1 overflow-auto p-4 text-xs text-gray-700 font-mono leading-relaxed">
          {definition ? JSON.stringify(definition, null, 2) : 'No definition yet.'}
        </pre>
      )}
    </div>
  )
}
