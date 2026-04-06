import { describe, it, expect } from 'vitest';
import {
  initRuntimeState,
  evaluateExpr,
  expandTemplate,
  applyStateOperation,
} from './expressionEvaluator';
import type { AppDefinitionV2, ModelField } from '@/types/appDefinition.types';

// ── initRuntimeState ──────────────────────────────────────────────────────────

describe('initRuntimeState', () => {
  it('initializes primitives from schema', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        name: { type: 'string', value: 'Alice' },
        count: { type: 'number', value: 0 },
        active: { type: 'boolean', value: true },
      },
      initialState: null,
    };
    expect(initRuntimeState(model)).toEqual({ name: 'Alice', count: 0, active: true });
  });

  it('prefers initialState over schema when present', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        name: { type: 'string', value: 'schema-value' },
      },
      initialState: {
        name: { type: 'string', value: 'initial-value' },
      },
    };
    expect(initRuntimeState(model)).toEqual({ name: 'initial-value' });
  });

  it('initializes arrays as empty arrays', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        items: { type: 'array', items: { type: 'string', value: '' } },
      },
      initialState: null,
    };
    expect(initRuntimeState(model)).toEqual({ items: [] });
  });

  it('initializes ref fields as null', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        user: { type: 'ref', ref: 'UserModel' },
      },
      initialState: null,
    };
    expect(initRuntimeState(model)).toEqual({ user: null });
  });

  it('initializes nested object fields recursively', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        ui: {
          type: 'object',
          properties: {
            darkMode: { type: 'boolean', value: false },
            lang: { type: 'string', value: 'en' },
          },
        },
      },
      initialState: null,
    };
    expect(initRuntimeState(model)).toEqual({ ui: { darkMode: false, lang: 'en' } });
  });

  it('returns null for primitive fields with no value', () => {
    const model: AppDefinitionV2['model'] = {
      schema: {
        missing: { type: 'string', value: undefined as unknown as string },
      },
      initialState: null,
    };
    expect(initRuntimeState(model)).toEqual({ missing: null });
  });
});

// ── evaluateExpr ──────────────────────────────────────────────────────────────

describe('evaluateExpr', () => {
  it('accesses state fields', () => {
    expect(evaluateExpr('state.count + 1', { count: 5 })).toBe(6);
  });

  it('accesses extra context variables', () => {
    expect(evaluateExpr('item.done', {}, { item: { done: true } })).toBe(true);
  });

  it('returns undefined for invalid expressions', () => {
    expect(evaluateExpr('state.foo.bar.baz', {})).toBeUndefined();
  });

  it('supports boolean logic', () => {
    expect(evaluateExpr('state.a && state.b', { a: true, b: false })).toBe(false);
    expect(evaluateExpr('state.a || state.b', { a: false, b: true })).toBe(true);
  });

  it('supports ternary expressions', () => {
    expect(evaluateExpr('state.x > 0 ? "pos" : "non-pos"', { x: 5 })).toBe('pos');
    expect(evaluateExpr('state.x > 0 ? "pos" : "non-pos"', { x: -1 })).toBe('non-pos');
  });

  it('evaluates array methods on state', () => {
    expect(evaluateExpr('state.items.length', { items: [1, 2, 3] })).toBe(3);
    expect(evaluateExpr('state.items.filter(x => x > 1)', { items: [1, 2, 3] })).toEqual([2, 3]);
  });

  it('returns undefined on syntax error', () => {
    expect(evaluateExpr('???invalid', {})).toBeUndefined();
  });

  it('evaluates literal values', () => {
    expect(evaluateExpr('"hello"', {})).toBe('hello');
    expect(evaluateExpr('42', {})).toBe(42);
    expect(evaluateExpr('true', {})).toBe(true);
  });
});

// ── expandTemplate ────────────────────────────────────────────────────────────

describe('expandTemplate', () => {
  it('replaces {{expr}} placeholders', () => {
    expect(expandTemplate('Hello {{state.name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('handles multiple placeholders', () => {
    expect(expandTemplate('{{state.a}} + {{state.b}}', { a: 1, b: 2 })).toBe('1 + 2');
  });

  it('replaces null/undefined results with empty string', () => {
    expect(expandTemplate('Value: {{state.missing}}', {})).toBe('Value: ');
  });

  it('passes extra context to expressions', () => {
    expect(expandTemplate('Item: {{item.name}}', {}, { item: { name: 'foo' } })).toBe('Item: foo');
  });

  it('returns the template unchanged when no placeholders', () => {
    expect(expandTemplate('no placeholders here', { x: 1 })).toBe('no placeholders here');
  });

  it('handles expressions in placeholders', () => {
    expect(expandTemplate('Count: {{state.items.length}}', { items: [1, 2, 3] })).toBe('Count: 3');
  });
});

// ── applyStateOperation ───────────────────────────────────────────────────────

describe('applyStateOperation – set', () => {
  it('sets a top-level field', () => {
    const next = applyStateOperation({ name: 'Alice' }, 'name', 'set', 'Bob');
    expect(next).toEqual({ name: 'Bob' });
  });

  it('strips "state." prefix from target', () => {
    const next = applyStateOperation({ count: 0 }, 'state.count', 'set', 5);
    expect(next).toEqual({ count: 5 });
  });

  it('sets a nested field via dot-notation', () => {
    const next = applyStateOperation({ ui: { darkMode: false } }, 'ui.darkMode', 'set', true);
    expect(next).toEqual({ ui: { darkMode: true } });
  });

  it('creates intermediate objects if missing', () => {
    const next = applyStateOperation({}, 'a.b.c', 'set', 42);
    expect(next).toEqual({ a: { b: { c: 42 } } });
  });

  it('does not mutate the original state', () => {
    const original = { count: 1 };
    applyStateOperation(original, 'count', 'set', 99);
    expect(original.count).toBe(1);
  });
});

describe('applyStateOperation – push', () => {
  it('appends a value to an array', () => {
    const next = applyStateOperation({ items: [1, 2] }, 'items', 'push', 3);
    expect(next.items).toEqual([1, 2, 3]);
  });

  it('creates an array if current is not an array', () => {
    const next = applyStateOperation({ items: null }, 'items', 'push', 'x');
    expect(next.items).toEqual(['x']);
  });
});

describe('applyStateOperation – remove', () => {
  it('removes by index (number value)', () => {
    const next = applyStateOperation({ items: ['a', 'b', 'c'] }, 'items', 'remove', 1);
    expect(next.items).toEqual(['a', 'c']);
  });

  it('removes by reference equality (non-number value)', () => {
    const next = applyStateOperation({ items: ['a', 'b', 'c'] }, 'items', 'remove', 'b');
    expect(next.items).toEqual(['a', 'c']);
  });

  it('removes with predicate function', () => {
    const next = applyStateOperation(
      { items: [1, 2, 3, 4] },
      'items',
      'remove',
      (x: unknown) => (x as number) % 2 === 0
    );
    expect(next.items).toEqual([1, 3]);
  });

  it('is a no-op on non-arrays', () => {
    const next = applyStateOperation({ x: 'hello' }, 'x', 'remove', 0);
    expect(next.x).toBe('hello');
  });
});

describe('applyStateOperation – filter', () => {
  it('filters array with predicate function', () => {
    const next = applyStateOperation(
      { items: [1, 2, 3, 4] },
      'items',
      'filter',
      (x: unknown) => (x as number) > 2
    );
    expect(next.items).toEqual([3, 4]);
  });

  it('is a no-op on non-arrays', () => {
    const next = applyStateOperation({ x: 5 }, 'x', 'filter', () => true);
    expect(next.x).toBe(5);
  });

  it('returns original array when value is not a function', () => {
    const next = applyStateOperation({ items: [1, 2] }, 'items', 'filter', 'not-a-function');
    expect(next.items).toEqual([1, 2]);
  });
});

describe('applyStateOperation – patch', () => {
  it('merges object fields', () => {
    const next = applyStateOperation(
      { user: { name: 'Alice', age: 30 } },
      'user',
      'patch',
      { age: 31, role: 'admin' }
    );
    expect(next.user).toEqual({ name: 'Alice', age: 31, role: 'admin' });
  });

  it('replaces non-object current with value', () => {
    const next = applyStateOperation({ x: null }, 'x', 'patch', { y: 1 });
    expect(next.x).toEqual({ y: 1 });
  });
});

describe('applyStateOperation – sort', () => {
  it('sorts in natural order when value is not a function', () => {
    const next = applyStateOperation({ items: [3, 1, 2] }, 'items', 'sort', undefined);
    expect(next.items).toEqual([1, 2, 3]);
  });

  it('sorts with comparator function', () => {
    const next = applyStateOperation(
      { items: [3, 1, 2] },
      'items',
      'sort',
      (a: unknown, b: unknown) => (b as number) - (a as number)
    );
    expect(next.items).toEqual([3, 2, 1]);
  });

  it('does not mutate the original array', () => {
    const original = { items: [3, 1, 2] };
    applyStateOperation(original, 'items', 'sort', undefined);
    expect(original.items).toEqual([3, 1, 2]);
  });

  it('is a no-op on non-arrays', () => {
    const next = applyStateOperation({ x: 'hello' }, 'x', 'sort', undefined);
    expect(next.x).toBe('hello');
  });
});
