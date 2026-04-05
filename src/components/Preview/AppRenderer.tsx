import clsx from 'clsx';
import { useAppRuntime } from '@/hooks/useAppRuntime';
import { ViewElementRenderer } from './ViewElementRenderer';
import type { AppDefinitionV2 } from '@/types/appDefinition.types';

export function AppRenderer({ definition }: { definition: AppDefinitionV2 }) {
  const { state, currentPage, fire, setAt, navigate } = useAppRuntime(definition);

  console.log('STATE: ', state);

  if (!currentPage) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Page not found.
      </div>
    );
  }

  const layoutClass = clsx(
    'flex-1 overflow-y-auto p-6',
    currentPage.layout === 'sidebar' && 'flex flex-row gap-6',
    currentPage.layout === 'fullscreen' && 'p-0',
    (!currentPage.layout || currentPage.layout === 'default') && 'flex flex-col gap-4'
  );

  return (
    <div className="h-full flex flex-col bg-white text-gray-900">
      {/* App header */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold">{definition.name}</h1>
        {definition.description && (
          <p className="text-sm mt-0.5 text-gray-500">{definition.description}</p>
        )}
      </div>

      {/* Page content */}
      <div className={layoutClass}>
        {currentPage.elements.map((element) => (
          <ViewElementRenderer
            key={element.id}
            element={element}
            state={state}
            extraContext={{}}
            onAction={(refs, extraCtx) => fire(refs, extraCtx)}
            onSet={setAt}
            isDark={false}
          />
        ))}
      </div>

      {/* Page navigation (if multiple pages) */}
      {definition.view.pages.length > 1 && (
        <nav className="px-6 py-3 border-t border-gray-200 flex gap-2 shrink-0">
          {definition.view.pages.map((page) => (
            <button
              key={page.id}
              onClick={() => navigate(page.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                page.id === currentPage.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {page.name}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
