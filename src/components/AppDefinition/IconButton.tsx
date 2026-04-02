import type { ReactNode } from 'react'

export interface IconButtonProps {
  title: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

export function IconButton({ title, disabled, onClick, children }: IconButtonProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}
