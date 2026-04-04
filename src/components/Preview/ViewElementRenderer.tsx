import clsx from 'clsx';
import type { ViewElement, ActionRef } from '@/types/appDefinition.types';
import { evaluateExpr, expandTemplate } from '@/lib/expressionEvaluator';

interface Props {
  element: ViewElement;
  state: Record<string, unknown>;
  extraContext: Record<string, unknown>;
  onAction: (refs: ActionRef[], extraContext?: Record<string, unknown>) => void;
  onSet: (target: string, value: unknown) => void;
  isDark: boolean;
}

export function ViewElementRenderer({
  element,
  state,
  extraContext,
  onAction,
  onSet,
  isDark,
}: Props) {
  // Visibility guard
  if (element.visibleWhen) {
    if (!evaluateExpr(element.visibleWhen, state, extraContext)) return null;
  }

  const sourceValue = element.source
    ? evaluateExpr(element.source, state, extraContext)
    : undefined;

  const fire = (refs?: ActionRef[]) => {
    if (refs?.length) onAction(refs, extraContext);
  };

  const handleChange = (newValue: unknown) => {
    if (element.target) onSet(element.target, newValue);
    fire(element.events?.onChange);
    fire(element.events?.onClick);
  };

  const layoutClass = clsx(
    element.layout === 'row' && 'flex flex-row gap-2 items-center',
    element.layout === 'column' && 'flex flex-col gap-2',
    element.layout === 'grid' && 'grid grid-cols-2 gap-2'
  );

  const inputBase = clsx(
    'text-sm rounded-lg border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors',
    isDark
      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  );

  const renderChildren = (overrideContext?: Record<string, unknown>) =>
    element.children?.map((child) => (
      <ViewElementRenderer
        key={child.id}
        element={child}
        state={state}
        extraContext={{ ...extraContext, ...(overrideContext ?? {}) }}
        onAction={(refs, ctx) =>
          onAction(refs, { ...extraContext, ...(overrideContext ?? {}), ...ctx })
        }
        onSet={onSet}
        isDark={isDark}
      />
    ));

  switch (element.type) {
    // ── Text ───────────────────────────────────────────────────────────────────
    case 'text': {
      const raw = sourceValue != null ? String(sourceValue) : (element.label ?? '');
      const text = expandTemplate(raw, state, extraContext);
      return (
        <span className={clsx('text-sm', isDark ? 'text-gray-200' : 'text-gray-800')}>{text}</span>
      );
    }

    // ── Input ──────────────────────────────────────────────────────────────────
    case 'input':
      return (
        <input
          type="text"
          className={clsx(inputBase, 'flex-1')}
          value={sourceValue != null ? String(sourceValue) : ''}
          placeholder={element.placeholder}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    // ── Checkbox ───────────────────────────────────────────────────────────────
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(sourceValue)}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4 accent-blue-600 rounded"
          />
          {element.label && (
            <span className={clsx('text-sm', isDark ? 'text-gray-300' : 'text-gray-700')}>
              {element.label}
            </span>
          )}
        </label>
      );

    // ── Date ───────────────────────────────────────────────────────────────────
    case 'date':
      return (
        <input
          type="date"
          className={inputBase}
          value={sourceValue != null ? String(sourceValue) : ''}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    // ── Dropdown ───────────────────────────────────────────────────────────────
    case 'dropdown': {
      // source is the selected value; children (if any) are options with label+source
      const selected = sourceValue != null ? String(sourceValue) : '';
      const hasChildOptions = element.children && element.children.length > 0;
      return (
        <select
          className={inputBase}
          value={selected}
          onChange={(e) => handleChange(e.target.value)}
        >
          {element.placeholder && <option value="">{element.placeholder}</option>}
          {hasChildOptions
            ? element.children!.map((child) => {
                const optVal = child.source
                  ? String(evaluateExpr(child.source, state, extraContext) ?? child.label ?? '')
                  : (child.label ?? '');
                return (
                  <option key={child.id} value={optVal}>
                    {child.label ?? optVal}
                  </option>
                );
              })
            : null}
        </select>
      );
    }

    // ── Button ─────────────────────────────────────────────────────────────────
    case 'button': {
      const variantClass = clsx(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
        element.variant === 'primary' &&
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        element.variant === 'success' &&
          'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
        element.variant === 'warning' &&
          'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400',
        (!element.variant || element.variant === 'secondary') &&
          (isDark
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400')
      );
      return (
        <button className={variantClass} onClick={() => fire(element.events?.onClick)}>
          {element.label ?? 'Button'}
        </button>
      );
    }

    // ── Panel ──────────────────────────────────────────────────────────────────
    case 'panel':
      return (
        <div className={clsx(layoutClass || 'flex flex-col gap-2', 'p-2')}>{renderChildren()}</div>
      );

    // ── List ───────────────────────────────────────────────────────────────────
    case 'list': {
      const allItems = Array.isArray(sourceValue) ? (sourceValue as unknown[]) : [];
      const items = element.filterExpr
        ? allItems.filter((item, index) =>
            Boolean(evaluateExpr(element.filterExpr!, state, { ...extraContext, item, index }))
          )
        : allItems;
      if (items.length === 0) {
        return (
          <p
            className={clsx('text-sm text-center py-4', isDark ? 'text-gray-500' : 'text-gray-400')}
          >
            No items.
          </p>
        );
      }
      return (
        <div className={clsx(layoutClass || 'flex flex-col gap-2')}>
          {items.map((listItem, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              {element.children?.map((child) => (
                <ViewElementRenderer
                  key={child.id}
                  element={child}
                  state={state}
                  extraContext={{ ...extraContext, item: listItem, index: idx }}
                  onAction={(refs, ctx) =>
                    onAction(refs, { ...extraContext, item: listItem, index: idx, ...ctx })
                  }
                  onSet={onSet}
                  isDark={isDark}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ── Form ───────────────────────────────────────────────────────────────────
    case 'form':
      return (
        <form
          className={clsx(layoutClass || 'flex flex-col gap-3')}
          onSubmit={(e) => {
            e.preventDefault();
            fire(element.events?.onSubmit);
          }}
        >
          {renderChildren()}
        </form>
      );

    // ── Table ──────────────────────────────────────────────────────────────────
    case 'table': {
      const rows = Array.isArray(sourceValue) ? (sourceValue as Record<string, unknown>[]) : [];
      const columns = rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== 'id') : [];

      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr
                className={clsx(isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600')}
              >
                {columns.map((col) => (
                  <th key={col} className="px-4 py-2 text-left font-medium capitalize">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={clsx(
                    'border-t',
                    isDark
                      ? 'border-gray-700 hover:bg-gray-800'
                      : 'border-gray-100 hover:bg-gray-50'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className={clsx('px-4 py-2', isDark ? 'text-gray-200' : 'text-gray-800')}
                    >
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className={clsx(
                      'px-4 py-6 text-center text-sm',
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    )}
                  >
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    // ── Image ──────────────────────────────────────────────────────────────────
    case 'image': {
      const src = sourceValue ? String(sourceValue) : '';
      return src ? (
        <img src={src} alt={element.label ?? ''} className="max-w-full rounded-lg object-cover" />
      ) : (
        <div
          className={clsx(
            'w-full h-32 rounded-lg flex items-center justify-center text-sm',
            isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
          )}
        >
          Image
        </div>
      );
    }

    default:
      return null;
  }
}
