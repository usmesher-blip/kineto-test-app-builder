import clsx from 'clsx'
import type { Field } from '@/types/builder.types.ts'

export interface FieldInputProps {
  field: Field
  value: unknown
  isDark: boolean
  onChange: (v: unknown) => void
}

export function FieldInput({ field, value, isDark, onChange }: FieldInputProps) {
  const base = clsx(
    'text-sm rounded-lg border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500',
    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-sm">{field.label}</span>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <select
        className={base}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{field.placeholder ?? field.label}</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      className={clsx(base, field.type === 'text' && 'flex-1')}
      placeholder={field.placeholder ?? field.label}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
