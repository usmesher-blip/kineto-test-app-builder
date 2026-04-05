import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppDefinitionV2, ActionRef, Page } from '@/types/appDefinition.types';
import { initRuntimeState, applyStateOperation } from '@/lib/expressionEvaluator';
import { dispatch, type StateContainer } from '@/lib/actionExecutor';

export function useAppRuntime(definition: AppDefinitionV2 | null) {
  const [state, setState] = useState<Record<string, unknown>>({});
  const [currentPageId, setCurrentPageId] = useState<string>('');

  // Shared mutable container — the executor writes here so sequential actions see latest state
  const stateContainer = useRef<StateContainer>({ current: state });

  useEffect(() => {
    if (!definition) return;
    const initial = initRuntimeState(definition.model);
    stateContainer.current.current = initial;
    setState(initial);
    setCurrentPageId(definition.view.defaultPageId);
  }, [definition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((pageId: string) => setCurrentPageId(pageId), []);

  const fire = useCallback(
    (refs: ActionRef[], extraContext: Record<string, unknown> = {}) => {
      if (!definition) return;
      dispatch(refs, {
        definition,
        state: stateContainer.current,
        setState: (s) => {
          stateContainer.current.current = s;
          setState(s);
        },
        navigate,
        extraContext,
      });
    },
    [definition, navigate]
  );

  /** Direct write to a state path, used by controlled inputs. */
  const setAt = useCallback((target: string, value: unknown) => {
    const next = applyStateOperation(stateContainer.current.current, target, 'set', value);
    stateContainer.current.current = next;
    setState(next);
  }, []);

  const currentPage: Page | null =
    definition?.view.pages.find((p) => p.id === currentPageId) ?? null;

  // Fire onMount actions when page changes
  useEffect(() => {
    if (!currentPage?.onMount || !definition) return;
    fire(currentPage.onMount);
  }, [currentPageId, definition?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, currentPage, fire, setAt, navigate };
}
