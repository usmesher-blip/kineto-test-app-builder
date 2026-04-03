import clsx from 'clsx'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { usePreviewApp } from '@/hooks/usePreviewApp'
import type { AppDefinition } from '@/types/builder.types.ts'
import { ItemRow } from './ItemRow'

export function AppRenderer({ definition }: { definition: AppDefinition }) {
  const { filteredItems, activeFilters, addItem, updateItem, deleteItem, clearCompleted, clearAll, setFilter } =
    usePreviewApp(definition)

  const isDark = definition.theme === 'dark'

  return (
    <div className={clsx('h-full flex flex-col', isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900')}>
      {/* App header */}
      <div className={clsx('px-6 py-4 border-b', isDark ? 'border-gray-700' : 'border-gray-200')}>
        <h1 className="text-xl font-bold">{definition.name}</h1>
        {definition.description && (
          <p className={clsx('text-sm mt-0.5', isDark ? 'text-gray-400' : 'text-gray-500')}>
            {definition.description}
          </p>
        )}
      </div>

      {/* Toolbar: actions + filters */}
      <div className={clsx('px-6 py-3 flex flex-wrap gap-3 items-center border-b', isDark ? 'border-gray-700' : 'border-gray-200')}>
        {/* Action buttons */}
        {definition.actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              if (action.type === 'add') addItem()
              else if (action.type === 'clear-completed') clearCompleted()
              else if (action.type === 'clear-all') clearAll()
            }}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              action.type === 'add'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            )}
          >
            {action.type === 'add' && <Plus size={14} />}
            {action.type === 'clear-completed' && <RotateCcw size={14} />}
            {action.type === 'clear-all' && <Trash2 size={14} />}
            {action.label}
          </button>
        ))}

        {/* Filter controls */}
        {definition.filters.map((filter) => {
          if (filter.type === 'search') {
            return (
              <input
                key={filter.id}
                type="text"
                placeholder={filter.label}
                value={(activeFilters[filter.id] as string) ?? ''}
                onChange={(e) => setFilter(filter.id, e.target.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm border',
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                )}
              />
            )
          }
          if (filter.type === 'boolean' || filter.type === 'select') {
            const opts =
              filter.type === 'boolean'
                ? [{ value: 'all', label: 'All' }, { value: 'true', label: 'Done' }, { value: 'false', label: 'Active' }]
                : [{ value: 'all', label: 'All' }, ...(filter.options ?? []).map((o) => ({ value: o, label: o }))]
            return (
              <select
                key={filter.id}
                value={(activeFilters[filter.id] as string) ?? 'all'}
                onChange={(e) => setFilter(filter.id, e.target.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm border',
                  isDark
                    ? 'bg-gray-800 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )
          }
          return null
        })}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filteredItems.length === 0 && (
          <p className={clsx('text-sm text-center mt-8', isDark ? 'text-gray-500' : 'text-gray-400')}>
            No items yet.
          </p>
        )}
        {filteredItems.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            fields={definition.fields}
            isDark={isDark}
            onUpdate={(fieldId, value) => updateItem(item.id, fieldId, value)}
            onDelete={() => deleteItem(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
