import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewElementRenderer } from './ViewElementRenderer';
import type { ViewElement, ActionRef } from '@/types/appDefinition.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const noop = () => {};

function renderEl(
  element: ViewElement,
  {
    state = {},
    extraContext = {},
    onAction = noop,
    onSet = noop,
    isDark = false,
  }: {
    state?: Record<string, unknown>;
    extraContext?: Record<string, unknown>;
    onAction?: (refs: ActionRef[], ctx?: Record<string, unknown>) => void;
    onSet?: (target: string, value: unknown) => void;
    isDark?: boolean;
  } = {}
) {
  return render(
    <ViewElementRenderer
      element={element}
      state={state}
      extraContext={extraContext}
      onAction={onAction}
      onSet={onSet}
      isDark={isDark}
    />
  );
}

// ── visibleWhen ───────────────────────────────────────────────────────────────

describe('visibleWhen', () => {
  it('renders the element when visibleWhen is truthy', () => {
    renderEl({
      id: 'el',
      type: 'text',
      label: 'Hello',
      visibleWhen: 'state.show',
    }, { state: { show: true } });
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('hides the element when visibleWhen is falsy', () => {
    renderEl({
      id: 'el',
      type: 'text',
      label: 'Hidden',
      visibleWhen: 'state.show',
    }, { state: { show: false } });
    expect(screen.queryByText('Hidden')).toBeNull();
  });
});

// ── text ──────────────────────────────────────────────────────────────────────

describe('text element', () => {
  it('renders source value from state', () => {
    renderEl({ id: 'el', type: 'text', source: 'state.greeting' }, { state: { greeting: 'Hello!' } });
    expect(screen.getByText('Hello!')).toBeTruthy();
  });

  it('falls back to label when source is absent', () => {
    renderEl({ id: 'el', type: 'text', label: 'Static Label' });
    expect(screen.getByText('Static Label')).toBeTruthy();
  });

  it('expands {{expr}} template placeholders', () => {
    renderEl(
      { id: 'el', type: 'text', source: '"Hello {{state.name}}!"' },
      { state: { name: 'World' } }
    );
    expect(screen.getByText('Hello World!')).toBeTruthy();
  });
});

// ── input ─────────────────────────────────────────────────────────────────────

describe('input element', () => {
  it('renders with the value from state', () => {
    renderEl({ id: 'el', type: 'input', source: 'state.text' }, { state: { text: 'initial' } });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('initial');
  });

  it('calls onSet with new value on change', () => {
    const onSet = vi.fn();
    renderEl({ id: 'el', type: 'input', source: 'state.text', target: 'text' }, { onSet });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
    expect(onSet).toHaveBeenCalledWith('text', 'new value');
  });

  it('shows placeholder text', () => {
    renderEl({ id: 'el', type: 'input', placeholder: 'Enter name…' });
    expect((screen.getByPlaceholderText('Enter name…') as HTMLInputElement)).toBeTruthy();
  });

  it('renders empty string when source resolves to null', () => {
    renderEl({ id: 'el', type: 'input', source: 'state.missing' }, { state: {} });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  });
});

// ── checkbox ──────────────────────────────────────────────────────────────────

describe('checkbox element', () => {
  it('renders checked state from source', () => {
    renderEl({ id: 'el', type: 'checkbox', source: 'state.done' }, { state: { done: true } });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('renders unchecked when source is false', () => {
    renderEl({ id: 'el', type: 'checkbox', source: 'state.done' }, { state: { done: false } });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('calls onSet with toggled value on change', () => {
    const onSet = vi.fn();
    renderEl({ id: 'el', type: 'checkbox', source: 'state.done', target: 'done' }, { state: { done: false }, onSet });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onSet).toHaveBeenCalledWith('done', true);
  });

  it('shows label text', () => {
    renderEl({ id: 'el', type: 'checkbox', label: 'Accept terms' });
    expect(screen.getByText('Accept terms')).toBeTruthy();
  });
});

// ── button ────────────────────────────────────────────────────────────────────

describe('button element', () => {
  it('renders with label text', () => {
    renderEl({ id: 'el', type: 'button', label: 'Click me' });
    expect(screen.getByRole('button', { name: 'Click me' })).toBeTruthy();
  });

  it('uses "Button" as fallback label', () => {
    renderEl({ id: 'el', type: 'button' });
    expect(screen.getByRole('button', { name: 'Button' })).toBeTruthy();
  });

  it('calls onAction with onClick refs when clicked', () => {
    const onAction = vi.fn();
    const refs: ActionRef[] = [{ actionId: 'doThing' }];
    renderEl(
      { id: 'el', type: 'button', label: 'Go', events: { onClick: refs } },
      { onAction }
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalledWith(refs, expect.anything());
  });

  it('does not call onAction when no onClick is defined', () => {
    const onAction = vi.fn();
    renderEl({ id: 'el', type: 'button', label: 'Noop' }, { onAction });
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).not.toHaveBeenCalled();
  });
});

// ── panel ─────────────────────────────────────────────────────────────────────

describe('panel element', () => {
  it('renders children', () => {
    renderEl({
      id: 'panel',
      type: 'panel',
      children: [
        { id: 'child-1', type: 'text', label: 'Child A' },
        { id: 'child-2', type: 'text', label: 'Child B' },
      ],
    });
    expect(screen.getByText('Child A')).toBeTruthy();
    expect(screen.getByText('Child B')).toBeTruthy();
  });
});

// ── list ──────────────────────────────────────────────────────────────────────

describe('list element', () => {
  it('renders "No items." when array is empty', () => {
    renderEl({ id: 'el', type: 'list', source: 'state.items' }, { state: { items: [] } });
    expect(screen.getByText('No items.')).toBeTruthy();
  });

  it('renders "No items." when source is not an array', () => {
    renderEl({ id: 'el', type: 'list', source: 'state.items' }, { state: { items: null } });
    expect(screen.getByText('No items.')).toBeTruthy();
  });

  it('renders children for each item', () => {
    renderEl(
      {
        id: 'el',
        type: 'list',
        source: 'state.items',
        children: [{ id: 'row', type: 'text', source: 'item.name' }],
      },
      { state: { items: [{ name: 'Alpha' }, { name: 'Beta' }] } }
    );
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('filters items with filterExpr without mutating the array', () => {
    const state = { items: [{ done: true }, { done: false }, { done: true }] };
    renderEl(
      {
        id: 'el',
        type: 'list',
        source: 'state.items',
        filterExpr: 'item.done',
        children: [{ id: 'row', type: 'text', source: 'item.done ? "yes" : "no"' }],
      },
      { state }
    );
    // Only the 2 done=true items should render
    expect(screen.getAllByText('yes')).toHaveLength(2);
    expect(screen.queryByText('no')).toBeNull();
    // Original array untouched
    expect(state.items).toHaveLength(3);
  });

  it('passes item and index into action context', () => {
    const onAction = vi.fn();
    const items = [{ name: 'X' }];
    renderEl(
      {
        id: 'el',
        type: 'list',
        source: 'state.items',
        children: [
          {
            id: 'btn',
            type: 'button',
            label: 'Del',
            events: { onClick: [{ actionId: 'remove' }] },
          },
        ],
      },
      { state: { items }, onAction }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Del' }));
    const [, ctx] = onAction.mock.calls[0] as [ActionRef[], Record<string, unknown>];
    expect(ctx.item).toEqual({ name: 'X' });
    expect(ctx.index).toBe(0);
  });
});

// ── form ──────────────────────────────────────────────────────────────────────

describe('form element', () => {
  it('calls onAction with onSubmit refs when form is submitted', () => {
    const onAction = vi.fn();
    const refs: ActionRef[] = [{ actionId: 'submitForm' }];
    renderEl(
      {
        id: 'el',
        type: 'form',
        events: { onSubmit: refs },
        children: [{ id: 'btn', type: 'button', label: 'Submit' }],
      },
      { onAction }
    );
    // Submit the form element directly
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(onAction).toHaveBeenCalledWith(refs, expect.anything());
  });
});

// ── table ─────────────────────────────────────────────────────────────────────

describe('table element', () => {
  it('renders column headers from object keys (excluding "id")', () => {
    renderEl(
      { id: 'el', type: 'table', source: 'state.rows' },
      { state: { rows: [{ id: '1', name: 'Alice', age: 30 }] } }
    );
    expect(screen.getByText('name')).toBeTruthy();
    expect(screen.getByText('age')).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'id' })).toBeNull();
  });

  it('renders row data', () => {
    renderEl(
      { id: 'el', type: 'table', source: 'state.rows' },
      { state: { rows: [{ name: 'Alice', age: 30 }] } }
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });

  it('renders "No data." when array is empty', () => {
    renderEl({ id: 'el', type: 'table', source: 'state.rows' }, { state: { rows: [] } });
    expect(screen.getByText('No data.')).toBeTruthy();
  });
});

// ── dropdown ──────────────────────────────────────────────────────────────────

describe('dropdown element', () => {
  it('renders options from children', () => {
    renderEl(
      {
        id: 'el',
        type: 'dropdown',
        source: 'state.val',
        children: [
          { id: 'opt-a', type: 'text', label: 'Option A', source: '"a"' },
          { id: 'opt-b', type: 'text', label: 'Option B', source: '"b"' },
        ],
      },
      { state: { val: 'a' } }
    );
    expect(screen.getByRole('option', { name: 'Option A' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Option B' })).toBeTruthy();
  });

  it('calls onSet with new value on change', () => {
    const onSet = vi.fn();
    renderEl(
      {
        id: 'el',
        type: 'dropdown',
        source: 'state.val',
        target: 'val',
        children: [
          { id: 'opt-a', type: 'text', label: 'A', source: '"a"' },
          { id: 'opt-b', type: 'text', label: 'B', source: '"b"' },
        ],
      },
      { state: { val: 'a' }, onSet }
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(onSet).toHaveBeenCalledWith('val', 'b');
  });

  it('shows placeholder option when provided', () => {
    renderEl(
      { id: 'el', type: 'dropdown', placeholder: 'Select one…' },
      { state: {} }
    );
    expect(screen.getByRole('option', { name: 'Select one…' })).toBeTruthy();
  });
});

// ── image ─────────────────────────────────────────────────────────────────────

describe('image element', () => {
  it('renders an img tag when source resolves to a URL', () => {
    renderEl(
      { id: 'el', type: 'image', source: 'state.url', label: 'Profile' },
      { state: { url: 'https://example.com/img.png' } }
    );
    const img = screen.getByRole('img', { name: 'Profile' }) as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img.png');
  });

  it('renders a placeholder div when source is empty', () => {
    renderEl({ id: 'el', type: 'image', source: 'state.url' }, { state: { url: '' } });
    expect(screen.getByText('Image')).toBeTruthy();
  });
});

// ── date ──────────────────────────────────────────────────────────────────────

describe('date element', () => {
  it('renders with value from state', () => {
    renderEl(
      { id: 'el', type: 'date', source: 'state.dob', target: 'dob' },
      { state: { dob: '2000-01-15' } }
    );
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input.value).toBe('2000-01-15');
  });

  it('calls onSet on change', () => {
    const onSet = vi.fn();
    renderEl(
      { id: 'el', type: 'date', source: 'state.dob', target: 'dob' },
      { state: { dob: '' }, onSet }
    );
    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2024-06-01' } });
    expect(onSet).toHaveBeenCalledWith('dob', '2024-06-01');
  });
});
