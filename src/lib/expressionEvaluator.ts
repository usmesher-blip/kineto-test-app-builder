import type { AppDefinition, ModelField, StateUpdateAction } from '@/types/appDefinition.types';

// ── Init runtime state from model schema ──────────────────────────────────────

export function initRuntimeState(model: AppDefinition['model']): Record<string, unknown> {
  const source = model.schema;
  return model.initialState ?? unwrapFields(source);
}

function unwrapFields(fields: Record<string, ModelField>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, unwrapField(v)]));
}

function unwrapField(field: ModelField): unknown {
  if (field.type === 'object') return unwrapFields(field.properties);
  if (field.type === 'array') return [];
  if (field.type === 'ref') return null;
  return null;
}

// ── Expression evaluation ─────────────────────────────────────────────────────

/**
 * Evaluate a JS expression string against app state and optional extra context.
 * State is available as `state` variable; extra keys (e.g. `item`, `index`) are
 * injected directly as top-level variables.
 */
export function evaluateExpr(
  expr: string,
  state: Record<string, unknown>,
  extraContext: Record<string, unknown> = {}
): unknown {
  try {
    const keys = Object.keys(extraContext);
    const vals = Object.values(extraContext);
    // eslint-disable-next-line no-new-func
    return new Function('state', ...keys, `"use strict"; return (${expr})`)(state, ...vals);
  } catch {
    return undefined;
  }
}

/** Expand {{expr}} placeholders inside a template string. */
export function expandTemplate(
  template: string,
  state: Record<string, unknown>,
  extraContext: Record<string, unknown> = {}
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
    const val = evaluateExpr(expr.trim(), state, extraContext);
    return val == null ? '' : String(val);
  });
}

// ── State mutation ────────────────────────────────────────────────────────────

/**
 * Returns a new state object with `value` applied at `target` using `operation`.
 * Target uses dot-notation, optionally prefixed with "state." (which is stripped).
 */
export function applyStateOperation(
  state: Record<string, unknown>,
  target: string,
  operation: StateUpdateAction['operation'],
  value: unknown
): Record<string, unknown> {
  const path = target.startsWith('state.') ? target.slice(6) : target;
  const keys = path.split('.');

  return setDeep(state, keys, operation, value);
}

function setDeep(
  obj: Record<string, unknown>,
  keys: string[],
  operation: StateUpdateAction['operation'],
  value: unknown
): Record<string, unknown> {
  const [head, ...rest] = keys;
  if (rest.length === 0) {
    console.log('SET_DEEP', head, { ...obj, [head]: applyOp(obj[head], operation, value) });

    return { ...obj, [head]: applyOp(obj[head], operation, value) };
  }
  const nested =
    obj[head] != null && typeof obj[head] === 'object'
      ? (obj[head] as Record<string, unknown>)
      : {};
  return { ...obj, [head]: setDeep(nested, rest, operation, value) };
}

function applyOp(
  current: unknown,
  operation: StateUpdateAction['operation'],
  value: unknown
): unknown {
  switch (operation) {
    case 'set':
      return value;

    case 'push':
      return [...(Array.isArray(current) ? current : []), value];

    case 'remove': {
      if (!Array.isArray(current)) return current;
      if (typeof value === 'function')
        return current.filter(
          (item, i) => !(value as (item: unknown, i: number) => boolean)(item, i)
        );
      if (typeof value === 'number') return current.filter((_, i) => i !== value);
      return current.filter((item) => item !== value);
    }

    case 'filter': {
      if (!Array.isArray(current)) return current;
      if (typeof value === 'function') return current.filter(value as (item: unknown) => boolean);
      return current;
    }

    case 'patch': {
      if (typeof current !== 'object' || current === null) return value;
      return { ...(current as object), ...(value as object) };
    }

    case 'sort': {
      if (!Array.isArray(current)) return current;
      return [...current].sort(
        typeof value === 'function' ? (value as (a: unknown, b: unknown) => number) : undefined
      );
    }

    default:
      return value;
  }
}
