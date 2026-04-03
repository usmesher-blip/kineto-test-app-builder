import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import type { Field, AppItem } from '@/types/builder.types.ts'
import { FieldInput } from './FieldInput'

export interface ItemRowProps {
  item: AppItem
  fields: Field[]
  isDark: boolean
  onUpdate: (fieldId: string, value: unknown) => void
  onDelete: () => void
}

export function ItemRow({ item, fields, isDark, onUpdate, onDelete }: ItemRowProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
        isDark ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' : 'border-gray-200 bg-white hover:bg-gray-50'
      )}
    >
      {fields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={item[field.id]}
          isDark={isDark}
          onChange={(v) => onUpdate(field.id, v)}
        />
      ))}
      <button
        onClick={onDelete}
        className={clsx(
          'ml-auto p-1 rounded transition-colors',
          isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-300 hover:text-red-500'
        )}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
