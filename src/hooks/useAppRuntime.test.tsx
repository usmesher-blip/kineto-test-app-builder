import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppRuntime } from './useAppRuntime';
import type { AppDefinition } from '@/types/appDefinition.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const def: AppDefinition = {
  id: 'rt-test',
  name: 'Runtime Test',
  description: '',
  model: {
    schema: {
      count: { type: 'number', value: 0 },
      name: { type: 'string', value: 'Alice' },
      tags: { type: 'array', items: { type: 'string', value: '' } },
    },
    initialState: null,
  },
  actions: {
    increment: {
      type: 'stateUpdate',
      target: 'count',
      operation: 'set',
      valueExpr: 'state.count + 1',
    },
    setName: {
      type: 'stateUpdate',
      target: 'name',
      operation: 'set',
      valueExpr: 'args.value',
    },
  },
  view: {
    defaultPageId: 'home',
    pages: [
      { id: 'home', name: 'Home', url: '/', elements: [] },
      { id: 'about', name: 'About', url: '/about', elements: [] },
    ],
  },
};

// ── State initialization ──────────────────────────────────────────────────────

describe('useAppRuntime – initialization', () => {
  it('initializes state from model schema', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    expect(result.current.state).toEqual({ count: 0, name: 'Alice', tags: [] });
  });

  it('sets currentPage to defaultPageId', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    expect(result.current.currentPage?.id).toBe('home');
  });

  it('returns null currentPage when definition is null', () => {
    const { result } = renderHook(() => useAppRuntime(null));
    expect(result.current.currentPage).toBeNull();
  });

  it('re-initializes state when definition id changes', () => {
    const def2: AppDefinition = {
      ...def,
      id: 'rt-test-2',
      model: {
        schema: { score: { type: 'number', value: 99 } },
        initialState: null,
      },
    };
    const { result, rerender } = renderHook(({ d }) => useAppRuntime(d), {
      initialProps: { d: def as AppDefinition | null },
    });
    expect(result.current.state.count).toBe(0);
    rerender({ d: def2 });
    expect(result.current.state.score).toBe(99);
  });
});

// ── navigate ──────────────────────────────────────────────────────────────────

describe('useAppRuntime – navigate', () => {
  it('changes currentPage to the target page', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.navigate('about'));
    expect(result.current.currentPage?.id).toBe('about');
  });

  it('currentPage is null for an unknown pageId', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.navigate('nonexistent'));
    expect(result.current.currentPage).toBeNull();
  });
});

// ── setAt ─────────────────────────────────────────────────────────────────────

describe('useAppRuntime – setAt', () => {
  it('writes a value to a top-level state field', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.setAt('name', 'Bob'));
    expect(result.current.state.name).toBe('Bob');
  });

  it('writes a value to a nested state path', () => {
    const nestedDef: AppDefinition = {
      ...def,
      id: 'nested-test',
      model: {
        schema: {
          ui: {
            type: 'object',
            properties: {
              darkMode: { type: 'boolean', value: false },
            },
          },
        },
        initialState: null,
      },
    };
    const { result } = renderHook(() => useAppRuntime(nestedDef));
    act(() => result.current.setAt('ui.darkMode', true));
    expect((result.current.state.ui as Record<string, unknown>).darkMode).toBe(true);
  });

  it('does not mutate other state fields', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.setAt('name', 'Carol'));
    expect(result.current.state.count).toBe(0);
  });
});

// ── fire ─────────────────────────────────────────────────────────────────────

describe('useAppRuntime – fire', () => {
  it('dispatches an action and updates state', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.fire([{ actionId: 'increment' }]));
    expect(result.current.state.count).toBe(1);
  });

  it('increments state correctly across multiple fires', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => {
      result.current.fire([{ actionId: 'increment' }]);
      result.current.fire([{ actionId: 'increment' }]);
      result.current.fire([{ actionId: 'increment' }]);
    });
    expect(result.current.state.count).toBe(3);
  });

  it('passes argBindings as args into the action', () => {
    const { result } = renderHook(() => useAppRuntime(def));
    act(() => result.current.fire([{ actionId: 'setName', argBindings: { value: '"Bob"' } }]));
    expect(result.current.state.name).toBe('Bob');
  });

  it('is a no-op when definition is null', () => {
    const { result } = renderHook(() => useAppRuntime(null));
    // Should not throw
    act(() => result.current.fire([{ actionId: 'increment' }]));
    expect(result.current.state).toEqual({});
  });
});

// ── onMount ───────────────────────────────────────────────────────────────────

describe('useAppRuntime – page onMount', () => {
  it('fires onMount actions when the page is mounted', () => {
    const defWithMount: AppDefinition = {
      ...def,
      id: 'mount-test',
      actions: {
        ...def.actions,
        markLoaded: {
          type: 'stateUpdate',
          target: 'count',
          operation: 'set',
          valueExpr: '99',
        },
      },
      view: {
        defaultPageId: 'home',
        pages: [
          {
            id: 'home',
            name: 'Home',
            url: '/',
            elements: [],
            onMount: [{ actionId: 'markLoaded' }],
          },
          { id: 'about', name: 'About', url: '/about', elements: [] },
        ],
      },
    };
    const { result } = renderHook(() => useAppRuntime(defWithMount));
    // onMount fires after the initial render
    expect(result.current.state.count).toBe(99);
  });
});
