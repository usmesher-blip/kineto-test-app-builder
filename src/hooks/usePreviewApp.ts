import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { AppItem, AppDefinition, Filter } from '@/types'
import { nanoid } from '@/utils/nanoid'

/** Returns item list, add/update/delete handlers, and filtered view */
export function usePreviewApp(definition: AppDefinition | null) {
  const { updateItems } = useAppStore()

  const [items, setItems] = useState<AppItem[]>(definition?.items ?? [])
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({})

  // Sync items when definition changes (e.g. after undo or import)
  useEffect(() => {
    setItems(definition?.items ?? [])
  }, [definition?.id])

  // Persist items back to store on every change
  useEffect(() => {
    updateItems(items)
  }, [items])

  const addItem = () => {
    const newItem: AppItem = { id: nanoid() }
    definition?.fields.forEach((f) => {
      newItem[f.id] = f.type === 'checkbox' ? false : ''
    })
    setItems((prev) => [...prev, newItem])
  }

  const updateItem = (id: string, fieldId: string, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [fieldId]: value } : item))
    )
  }

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const clearCompleted = () => {
    // "completed" is typically a boolean field — find the first checkbox field
    const checkField = definition?.fields.find((f) => f.type === 'checkbox')
    if (!checkField) return
    setItems((prev) => prev.filter((item) => !item[checkField.id]))
  }

  const clearAll = () => setItems([])

  const setFilter = (filterId: string, value: unknown) => {
    setActiveFilters((prev) => ({ ...prev, [filterId]: value }))
  }

  const filteredItems = applyFilters(items, activeFilters, definition?.filters ?? [])

  return {
    items,
    filteredItems,
    activeFilters,
    addItem,
    updateItem,
    deleteItem,
    clearCompleted,
    clearAll,
    setFilter,
  }
}

function applyFilters(
  items: AppItem[],
  activeFilters: Record<string, unknown>,
  filters: Filter[]
): AppItem[] {
  return filters.reduce((acc, filter) => {
    const value = activeFilters[filter.id]
    if (value === undefined || value === '' || value === null) return acc

    return acc.filter((item) => {
      const fieldValue = item[filter.field]
      switch (filter.type) {
        case 'boolean':
          return value === 'all' ? true : fieldValue === (value === 'true')
        case 'search':
          return String(fieldValue ?? '').toLowerCase().includes(String(value).toLowerCase())
        case 'select':
          return value === 'all' || fieldValue === value
        default:
          return true
      }
    })
  }, items)
}
