import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatch } from './actionExecutor';
import type { RuntimeContext, StateContainer } from './actionExecutor';
import type { AppDefinition } from '@/types/appDefinition.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(
  actions: AppDefinition['actions'],
  initialState: Record<string, unknown> = {},
  overrides: Partial<RuntimeContext> = {}
): RuntimeContext & { setState: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> } {
  const stateContainer: StateContainer = { current: { ...initialState } };
  const setState = vi.fn((s: Record<string, unknown>) => {
    stateContainer.current = s;
  });
  const navigate = vi.fn();

  return {
    definition: {
      id: 'test',
      name: 'Test',
      description: '',
      model: { schema: {}, initialState: null },
      actions,
      view: { defaultPageId: 'p1', pages: [] },
    },
    state: stateContainer,
    setState,
    navigate,
    extraContext: {},
    ...overrides,
  };
}

// ── dispatch ──────────────────────────────────────────────────────────────────

describe('dispatch', () => {
  it('warns and skips unknown action IDs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = makeCtx({});
    dispatch([{ actionId: 'missing' }], ctx);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing'));
    warn.mockRestore();
  });
});

// ── stateUpdate ───────────────────────────────────────────────────────────────

describe('stateUpdate action', () => {
  it('sets a state field via valueExpr', () => {
    const ctx = makeCtx(
      {
        setName: { type: 'stateUpdate', target: 'name', operation: 'set', valueExpr: '"Bob"' },
      },
      { name: 'Alice' }
    );
    dispatch([{ actionId: 'setName' }], ctx);
    expect(ctx.setState).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bob' }));
    expect(ctx.state.current.name).toBe('Bob');
  });

  it('evaluates valueExpr against current state', () => {
    const ctx = makeCtx(
      {
        increment: {
          type: 'stateUpdate',
          target: 'count',
          operation: 'set',
          valueExpr: 'state.count + 1',
        },
      },
      { count: 3 }
    );
    dispatch([{ actionId: 'increment' }], ctx);
    expect(ctx.state.current.count).toBe(4);
  });

  it('skips update when condition is falsy', () => {
    const ctx = makeCtx(
      {
        guarded: {
          type: 'stateUpdate',
          target: 'x',
          operation: 'set',
          valueExpr: '99',
          condition: 'false',
        },
      },
      { x: 0 }
    );
    dispatch([{ actionId: 'guarded' }], ctx);
    expect(ctx.setState).not.toHaveBeenCalled();
    expect(ctx.state.current.x).toBe(0);
  });

  it('applies update when condition is truthy', () => {
    const ctx = makeCtx(
      {
        guarded: {
          type: 'stateUpdate',
          target: 'x',
          operation: 'set',
          valueExpr: '99',
          condition: 'state.ready',
        },
      },
      { x: 0, ready: true }
    );
    dispatch([{ actionId: 'guarded' }], ctx);
    expect(ctx.state.current.x).toBe(99);
  });

  it('pushes an item to an array', () => {
    const ctx = makeCtx(
      {
        addItem: {
          type: 'stateUpdate',
          target: 'items',
          operation: 'push',
          valueExpr: '"newItem"',
        },
      },
      { items: ['a', 'b'] }
    );
    dispatch([{ actionId: 'addItem' }], ctx);
    expect(ctx.state.current.items).toEqual(['a', 'b', 'newItem']);
  });
});

// ── navigate ──────────────────────────────────────────────────────────────────

describe('navigate action', () => {
  it('calls navigate with pageId', () => {
    const ctx = makeCtx({
      goHome: { type: 'navigate', pageId: 'home' },
    });
    dispatch([{ actionId: 'goHome' }], ctx);
    expect(ctx.navigate).toHaveBeenCalledWith('home', undefined);
  });

  it('passes params to navigate', () => {
    const ctx = makeCtx({
      goUser: { type: 'navigate', pageId: 'user', params: { id: '42' } },
    });
    dispatch([{ actionId: 'goUser' }], ctx);
    expect(ctx.navigate).toHaveBeenCalledWith('user', { id: '42' });
  });
});

// ── sequence ──────────────────────────────────────────────────────────────────

describe('sequence action', () => {
  it('executes steps in order', () => {
    const ctx = makeCtx(
      {
        seq: {
          type: 'sequence',
          steps: [{ actionId: 'setA' }, { actionId: 'setB' }],
        },
        setA: { type: 'stateUpdate', target: 'a', operation: 'set', valueExpr: '1' },
        setB: { type: 'stateUpdate', target: 'b', operation: 'set', valueExpr: '2' },
      },
      { a: 0, b: 0 }
    );
    dispatch([{ actionId: 'seq' }], ctx);
    expect(ctx.state.current.a).toBe(1);
    expect(ctx.state.current.b).toBe(2);
  });

  it('passes state updates from earlier steps to later steps', () => {
    // setB reads state.a which was set by setA
    const ctx = makeCtx(
      {
        seq: {
          type: 'sequence',
          steps: [{ actionId: 'setA' }, { actionId: 'doubleA' }],
        },
        setA: { type: 'stateUpdate', target: 'a', operation: 'set', valueExpr: '5' },
        doubleA: {
          type: 'stateUpdate',
          target: 'result',
          operation: 'set',
          valueExpr: 'state.a * 2',
        },
      },
      { a: 0, result: 0 }
    );
    dispatch([{ actionId: 'seq' }], ctx);
    expect(ctx.state.current.result).toBe(10);
  });
});

// ── conditional ───────────────────────────────────────────────────────────────

describe('conditional action', () => {
  it('dispatches "then" branch when condition is truthy', () => {
    const ctx = makeCtx(
      {
        cond: {
          type: 'conditional',
          condition: 'state.flag',
          then: [{ actionId: 'setX' }],
          else: [{ actionId: 'setY' }],
        },
        setX: { type: 'stateUpdate', target: 'result', operation: 'set', valueExpr: '"x"' },
        setY: { type: 'stateUpdate', target: 'result', operation: 'set', valueExpr: '"y"' },
      },
      { flag: true, result: '' }
    );
    dispatch([{ actionId: 'cond' }], ctx);
    expect(ctx.state.current.result).toBe('x');
  });

  it('dispatches "else" branch when condition is falsy', () => {
    const ctx = makeCtx(
      {
        cond: {
          type: 'conditional',
          condition: 'state.flag',
          then: [{ actionId: 'setX' }],
          else: [{ actionId: 'setY' }],
        },
        setX: { type: 'stateUpdate', target: 'result', operation: 'set', valueExpr: '"x"' },
        setY: { type: 'stateUpdate', target: 'result', operation: 'set', valueExpr: '"y"' },
      },
      { flag: false, result: '' }
    );
    dispatch([{ actionId: 'cond' }], ctx);
    expect(ctx.state.current.result).toBe('y');
  });

  it('dispatches nothing when condition is falsy and else is absent', () => {
    const ctx = makeCtx(
      {
        cond: {
          type: 'conditional',
          condition: 'false',
          then: [{ actionId: 'setX' }],
        },
        setX: { type: 'stateUpdate', target: 'result', operation: 'set', valueExpr: '"x"' },
      },
      { result: '' }
    );
    dispatch([{ actionId: 'cond' }], ctx);
    expect(ctx.setState).not.toHaveBeenCalled();
  });
});

// ── argBindings ───────────────────────────────────────────────────────────────

describe('argBindings', () => {
  it('injects evaluated args into extraContext', () => {
    // The action sets state.result to args.val, which is bound from state.source
    const ctx = makeCtx(
      {
        setFromArg: {
          type: 'stateUpdate',
          target: 'result',
          operation: 'set',
          valueExpr: 'args.val',
        },
      },
      { source: 42, result: 0 }
    );
    dispatch([{ actionId: 'setFromArg', argBindings: { val: 'state.source' } }], ctx);
    expect(ctx.state.current.result).toBe(42);
  });
});

// ── apiCall ───────────────────────────────────────────────────────────────────

describe('apiCall action', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls fetch with the correct URL and method', async () => {
    const mockRes = { ok: true, json: async () => ({ id: 1 }) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const ctx = makeCtx(
      {
        loadData: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/items',
          onSuccess: [],
          onError: [],
        },
      },
      {}
    );
    dispatch([{ actionId: 'loadData' }], ctx);
    await vi.waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({ method: 'GET' }))
    );
  });

  it('expands {{expr}} placeholders in URL', async () => {
    const mockRes = { ok: true, json: async () => ({}) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const ctx = makeCtx(
      {
        loadUser: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/users/{{state.userId}}',
          onSuccess: [],
          onError: [],
        },
      },
      { userId: 7 }
    );
    dispatch([{ actionId: 'loadUser' }], ctx);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/users/7', expect.anything()));
  });

  it('stores response in resultTarget on success', async () => {
    const data = { id: 1, name: 'Alice' };
    const mockRes = { ok: true, json: async () => data };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const ctx = makeCtx(
      {
        loadUser: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/user',
          resultTarget: 'user',
          onSuccess: [],
          onError: [],
        },
      },
      { user: null }
    );
    dispatch([{ actionId: 'loadUser' }], ctx);
    await vi.waitFor(() => expect(ctx.state.current.user).toEqual(data));
  });

  it('dispatches onError when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const ctx = makeCtx(
      {
        loadData: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/items',
          onSuccess: [{ actionId: 'onOk' }],
          onError: [{ actionId: 'onFail' }],
        },
        onOk: { type: 'stateUpdate', target: 'status', operation: 'set', valueExpr: '"ok"' },
        onFail: { type: 'stateUpdate', target: 'status', operation: 'set', valueExpr: '"error"' },
      },
      { status: '' }
    );
    dispatch([{ actionId: 'loadData' }], ctx);
    await vi.waitFor(() => expect(ctx.state.current.status).toBe('error'));
  });

  it('dispatches onError when HTTP status is not ok', async () => {
    const mockRes = { ok: false, status: 404, json: async () => ({}) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const ctx = makeCtx(
      {
        loadData: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/items',
          onSuccess: [{ actionId: 'onOk' }],
          onError: [{ actionId: 'onFail' }],
        },
        onOk: { type: 'stateUpdate', target: 'status', operation: 'set', valueExpr: '"ok"' },
        onFail: { type: 'stateUpdate', target: 'status', operation: 'set', valueExpr: '"error"' },
      },
      { status: '' }
    );
    dispatch([{ actionId: 'loadData' }], ctx);
    await vi.waitFor(() => expect(ctx.state.current.status).toBe('error'));
  });

  it('appends query params to URL', async () => {
    const mockRes = { ok: true, json: async () => ({}) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const ctx = makeCtx(
      {
        search: {
          type: 'apiCall',
          api: 'myApi',
          method: 'GET',
          url: '/api/search',
          queryParams: { q: '{{state.query}}', page: '1' },
          onSuccess: [],
          onError: [],
        },
      },
      { query: 'hello' }
    );
    dispatch([{ actionId: 'search' }], ctx);
    await vi.waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=hello'), expect.anything())
    );
  });
});
