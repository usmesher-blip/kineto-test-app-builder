import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import { $messages, $isGenerating, $history, builderActions } from '@/store/builder.store';
import type { AppDefinition } from '@/types/appDefinition.types';

// Mock the AI module so tests never make real network requests
vi.mock('@/lib/ai', () => ({
  sendToAI: vi.fn(),
}));

// Import after mock is set up
import { sendToAI } from '@/lib/ai';
const mockSendToAI = vi.mocked(sendToAI);

const sampleDef: AppDefinition = {
  id: 'chat-test',
  name: 'Chat Test',
  description: '',
  model: { schema: {}, initialState: null },
  actions: {},
  view: {
    defaultPageId: 'home',
    pages: [{ id: 'home', name: 'Home', url: '/', elements: [] }],
  },
};

beforeEach(() => {
  builderActions.reset();
  vi.clearAllMocks();
});

// ── Guard conditions ──────────────────────────────────────────────────────────

describe('useChat – guards', () => {
  it('ignores whitespace-only messages', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(mockSendToAI).not.toHaveBeenCalled();
    // No user message added (only the reset empty state)
    expect($messages.get().filter((m) => m.role === 'user')).toHaveLength(0);
  });

  it('ignores empty string messages', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('');
    });
    expect(mockSendToAI).not.toHaveBeenCalled();
  });

  it('ignores new message while already generating', async () => {
    $isGenerating.set(true);
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    expect(mockSendToAI).not.toHaveBeenCalled();
    $isGenerating.set(false);
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('useChat – happy path', () => {
  it('adds a user message before calling the AI', async () => {
    mockSendToAI.mockResolvedValue({ message: 'Done!' });
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('Build a counter');
    });
    const userMsgs = $messages.get().filter((m) => m.role === 'user');
    expect(userMsgs.some((m) => m.content === 'Build a counter')).toBe(true);
  });

  it('adds an assistant reply after success', async () => {
    mockSendToAI.mockResolvedValue({ message: 'Here is your app!' });
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    const assistantMsgs = $messages.get().filter((m) => m.role === 'assistant');
    expect(assistantMsgs.some((m) => m.content === 'Here is your app!')).toBe(true);
  });

  it('calls sendToAI with the conversation so far', async () => {
    mockSendToAI.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('my prompt');
    });
    expect(mockSendToAI).toHaveBeenCalledOnce();
    const [messages] = mockSendToAI.mock.calls[0];
    expect(messages.some((m) => m.content === 'my prompt')).toBe(true);
  });

  it('clears isGenerating after success', async () => {
    mockSendToAI.mockResolvedValue({ message: 'ok' });
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    expect($isGenerating.get()).toBe(false);
  });
});

// ── Definition update ─────────────────────────────────────────────────────────

describe('useChat – definition update', () => {
  it('applies returned definition to history', async () => {
    mockSendToAI.mockResolvedValue({ message: 'Created!', definition: sampleDef });
    const { result } = renderHook(() => useChat());
    const prevLen = $history.get().length;
    await act(async () => {
      await result.current.sendMessage('build app');
    });
    expect($history.get().length).toBeGreaterThan(prevLen);
  });

  it('does not add a snapshot when definition is absent', async () => {
    mockSendToAI.mockResolvedValue({ message: 'Just chatting' });
    const { result } = renderHook(() => useChat());
    const prevLen = $history.get().length;
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    expect($history.get().length).toBe(prevLen);
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe('useChat – error handling', () => {
  it('adds an error assistant message when sendToAI throws', async () => {
    mockSendToAI.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    const assistantMsgs = $messages.get().filter((m) => m.role === 'assistant');
    expect(assistantMsgs.some((m) => m.content.includes('Network error'))).toBe(true);
  });

  it('clears isGenerating after an error', async () => {
    mockSendToAI.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    expect($isGenerating.get()).toBe(false);
  });

  it('includes a generic message for non-Error throws', async () => {
    mockSendToAI.mockRejectedValue('string error');
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('hello');
    });
    const assistantMsgs = $messages.get().filter((m) => m.role === 'assistant');
    expect(assistantMsgs.some((m) => m.content.includes('Unknown error'))).toBe(true);
  });
});

// ── Hook return values ────────────────────────────────────────────────────────

describe('useChat – return shape', () => {
  it('exposes messages, isGenerating, and sendMessage', () => {
    const { result } = renderHook(() => useChat());
    expect(Array.isArray(result.current.messages)).toBe(true);
    expect(typeof result.current.isGenerating).toBe('boolean');
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('messages reactive – updates after sendMessage', async () => {
    mockSendToAI.mockResolvedValue({ message: 'reply' });
    const { result } = renderHook(() => useChat());
    const initialLen = result.current.messages.length;
    await act(async () => {
      await result.current.sendMessage('ping');
    });
    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(initialLen);
    });
  });
});
