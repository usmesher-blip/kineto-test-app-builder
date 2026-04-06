import { describe, it, expect, beforeEach } from 'vitest';
import {
  $history,
  $messages,
  $isGenerating,
  $currentDefinition,
  $canUndo,
  builderActions,
} from './builder.store';
import type { AppDefinitionV2 } from '@/types/appDefinition.types';

const makeDef = (id = 'def-1'): AppDefinitionV2 => ({
  id,
  name: 'Test App',
  description: 'A test',
  model: { schema: {}, initialState: null },
  actions: {},
  view: {
    defaultPageId: 'home',
    pages: [{ id: 'home', name: 'Home', url: '/', elements: [] }],
  },
});

// Reset to a clean slate before each test: history=[1 empty snapshot], messages=[]
beforeEach(() => builderActions.reset());

// ── applyDefinition ───────────────────────────────────────────────────────────

describe('applyDefinition', () => {
  it('adds a snapshot to history', () => {
    const before = $history.get().length;
    builderActions.applyDefinition(makeDef(), 'first');
    expect($history.get().length).toBe(before + 1);
  });

  it('snapshot stores the label', () => {
    builderActions.applyDefinition(makeDef(), 'my label');
    const last = $history.get().at(-1)!;
    expect(last.label).toBe('my label');
  });

  it('snapshot assigns a fresh id to the definition (not the original)', () => {
    const original = makeDef('original-id');
    builderActions.applyDefinition(original, 'x');
    const saved = $history.get().at(-1)!.definition;
    expect(saved.id).not.toBe('original-id');
  });

  it('snapshot has a timestamp', () => {
    const before = Date.now();
    builderActions.applyDefinition(makeDef(), 'x');
    const ts = $history.get().at(-1)!.timestamp;
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  it('caps history at 50 entries', () => {
    // reset gives us 1 entry; push 50 more → should cap at 50
    for (let i = 0; i < 50; i++) {
      builderActions.applyDefinition(makeDef(`d-${i}`), `step ${i}`);
    }
    expect($history.get().length).toBe(50);
  });
});

// ── $currentDefinition ────────────────────────────────────────────────────────

describe('$currentDefinition', () => {
  it('returns null when history is empty', () => {
    $history.set([]);
    expect($currentDefinition.get()).toBeNull();
  });

  it('returns the definition from the last snapshot', () => {
    builderActions.applyDefinition(makeDef(), 'first');
    builderActions.applyDefinition({ ...makeDef(), name: 'Second App' }, 'second');
    expect($currentDefinition.get()?.name).toBe('Second App');
  });
});

// ── $canUndo ──────────────────────────────────────────────────────────────────

describe('$canUndo', () => {
  it('is false when history has one entry', () => {
    // reset() leaves exactly 1 entry
    expect($history.get().length).toBe(1);
    expect($canUndo.get()).toBe(false);
  });

  it('is true when history has more than one entry', () => {
    builderActions.applyDefinition(makeDef(), 'second');
    expect($canUndo.get()).toBe(true);
  });
});

// ── undo ──────────────────────────────────────────────────────────────────────

describe('undo', () => {
  it('pops the last snapshot', () => {
    builderActions.applyDefinition(makeDef(), 'first');
    builderActions.applyDefinition({ ...makeDef(), name: 'Second' }, 'second');
    const lenBefore = $history.get().length;
    builderActions.undo();
    expect($history.get().length).toBe(lenBefore - 1);
  });

  it('restores the previous definition after undo', () => {
    builderActions.applyDefinition({ ...makeDef(), name: 'First' }, 'first');
    builderActions.applyDefinition({ ...makeDef(), name: 'Second' }, 'second');
    builderActions.undo();
    expect($currentDefinition.get()?.name).toBe('First');
  });

  it('does nothing when only one snapshot remains', () => {
    expect($history.get().length).toBe(1);
    builderActions.undo();
    expect($history.get().length).toBe(1);
  });
});

// ── addMessage ────────────────────────────────────────────────────────────────

describe('addMessage', () => {
  it('appends a message with generated id and timestamp', () => {
    const before = Date.now();
    builderActions.addMessage({ role: 'user', content: 'hello' });
    const msg = $messages.get().at(-1)!;
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
    expect(msg.id).toBeTruthy();
    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
  });

  it('appends multiple messages in order', () => {
    builderActions.addMessage({ role: 'user', content: 'first' });
    builderActions.addMessage({ role: 'assistant', content: 'second' });
    const msgs = $messages.get();
    expect(msgs.at(-2)?.content).toBe('first');
    expect(msgs.at(-1)?.content).toBe('second');
  });
});

// ── setGenerating ─────────────────────────────────────────────────────────────

describe('setGenerating', () => {
  it('sets isGenerating to true', () => {
    builderActions.setGenerating(true);
    expect($isGenerating.get()).toBe(true);
  });

  it('sets isGenerating to false', () => {
    builderActions.setGenerating(true);
    builderActions.setGenerating(false);
    expect($isGenerating.get()).toBe(false);
  });
});

// ── exportDefinition ──────────────────────────────────────────────────────────

describe('exportDefinition', () => {
  it('returns a JSON string of the current definition', () => {
    builderActions.applyDefinition({ ...makeDef(), name: 'Export Test' }, 'export');
    const json = builderActions.exportDefinition();
    const parsed = JSON.parse(json) as AppDefinitionV2;
    expect(parsed.name).toBe('Export Test');
  });

  it('returns "{}" when history is empty', () => {
    $history.set([]);
    expect(builderActions.exportDefinition()).toBe('{}');
  });
});

// ── importDefinition ──────────────────────────────────────────────────────────

describe('importDefinition', () => {
  it('parses JSON and adds a snapshot', () => {
    const def = makeDef('imported');
    const before = $history.get().length;
    builderActions.importDefinition(JSON.stringify(def));
    expect($history.get().length).toBe(before + 1);
    expect($currentDefinition.get()?.name).toBe(def.name);
  });

  it('labels the snapshot "Imported definition"', () => {
    builderActions.importDefinition(JSON.stringify(makeDef()));
    expect($history.get().at(-1)!.label).toBe('Imported definition');
  });
});

// ── reset ─────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears messages', () => {
    builderActions.addMessage({ role: 'user', content: 'hi' });
    builderActions.reset();
    expect($messages.get()).toEqual([]);
  });

  it('resets isGenerating', () => {
    builderActions.setGenerating(true);
    builderActions.reset();
    expect($isGenerating.get()).toBe(false);
  });

  it('leaves exactly one snapshot (the empty definition)', () => {
    builderActions.applyDefinition(makeDef(), 'extra');
    builderActions.reset();
    expect($history.get().length).toBe(1);
  });
});
