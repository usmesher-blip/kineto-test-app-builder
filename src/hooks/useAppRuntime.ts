import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppDefinitionV2, ActionRef, Page } from '@/types/appDefinition.types';
import { initRuntimeState, applyStateOperation } from '@/lib/expressionEvaluator';
import { executeActionRef } from '@/lib/actionExecutor';
import type { RuntimeContext } from '@/lib/actionExecutor';

export function useAppRuntime(definition: AppDefinitionV2 | null) {
  const [state, setState] = useState<Record<string, unknown>>({});
  const [currentPageId, setCurrentPageId] = useState<string>('');

  // Mutable ref so sequential actions always see the latest state
  const stateRef = useRef(state);
  stateRef.current = state;

  // Re-initialize when definition changes
  useEffect(() => {
    if (!definition) return;
    const initial = initRuntimeState(definition.model);
    stateRef.current = initial;
    setState(initial);
    setCurrentPageId(definition.view.defaultPageId);
  }, [definition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
  }, []);

  /**
   * Execute a list of ActionRefs sequentially, threading updated state
   * through each step so subsequent actions see changes from earlier ones.
   */
  const executeAction = useCallback(
    (refs: ActionRef[], extraContext: Record<string, unknown> = {}) => {
      if (!definition) return;

      const threadedSetState = (s: Record<string, unknown>) => {
        stateRef.current = s;
        setState(s);
      };

      for (const ref of refs) {
        const ctx: RuntimeContext = {
          definition,
          state: stateRef.current,
          setState: threadedSetState,
          navigate,
          extraContext,
        };
        executeActionRef(ref, ctx);
      }
    },
    [definition, navigate]
  );

  /** Direct write to a state path, useful for controlled inputs. */
  const setAt = useCallback((target: string, value: unknown) => {
    setState((prev) => {
      const next = applyStateOperation(prev, target, 'set', value);
      stateRef.current = next;
      return next;
    });
  }, []);

  const currentPage: Page | null =
    definition?.view.pages.find((p) => p.id === currentPageId) ?? null;

  // Fire onMount actions when page changes
  useEffect(() => {
    if (!currentPage?.onMount || !definition) return;
    executeAction(currentPage.onMount);
  }, [currentPageId, definition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, currentPage, executeAction, setAt, navigate };
}
