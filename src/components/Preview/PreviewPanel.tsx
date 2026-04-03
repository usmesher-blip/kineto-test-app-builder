import { useStore } from '@nanostores/react'
import { $currentDefinition } from '@/store/builder.store.ts'
import { AppRenderer } from './AppRenderer'

export function PreviewPanel() {
  const definition = useStore($currentDefinition)

  const isEmpty =
    !definition ||
    definition.view.pages.every((p) => p.elements.length === 0)

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Your app preview will appear here.
      </div>
    )
  }

  return <AppRenderer definition={definition} />
}
