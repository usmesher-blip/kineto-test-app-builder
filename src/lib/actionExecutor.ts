import type { AppDefinitionV2, Action, ActionRef } from '@/types/appDefinition.types';
import { evaluateExpr, expandTemplate, applyStateOperation } from './expressionEvaluator';

/** Mutable state container — lets sequential actions always see the latest state. */
export type StateContainer = { current: Record<string, unknown> };

export type RuntimeContext = {
  definition: AppDefinitionV2;
  state: StateContainer;
  setState: (s: Record<string, unknown>) => void;
  navigate: (pageId: string, params?: Record<string, string>) => void;
  extraContext: Record<string, unknown>;
};

/** Single emitter — resolve ActionRefs and dispatch each one. */
export function dispatch(refs: ActionRef[], ctx: RuntimeContext): void {
  for (const ref of refs) {
    const action = ctx.definition.actions[ref.actionId];
    if (!action) {
      console.warn(`[runtime] Unknown action: "${ref.actionId}"`);
      continue;
    }
    handle(action, withArgs(ref, ctx));
  }
}

function withArgs(ref: ActionRef, ctx: RuntimeContext): RuntimeContext {
  if (!ref.argBindings || Object.keys(ref.argBindings).length === 0) return ctx;
  const args: Record<string, unknown> = {};
  for (const [key, expr] of Object.entries(ref.argBindings)) {
    args[key] = evaluateExpr(expr, ctx.state.current, ctx.extraContext);
  }
  return { ...ctx, extraContext: { ...ctx.extraContext, args } };
}

/** Single handler — the action "reducer". */
function handle(action: Action, ctx: RuntimeContext): void {
  switch (action.type) {
    case 'stateUpdate': {
      if (action.condition && !evaluateExpr(action.condition, ctx.state.current, ctx.extraContext)) return;
      const value = evaluateExpr(action.valueExpr, ctx.state.current, ctx.extraContext);
      const next = applyStateOperation(ctx.state.current, action.target, action.operation, value);
      ctx.state.current = next;
      ctx.setState(next);
      return;
    }

    case 'navigate': {
      ctx.navigate(action.pageId, action.params);
      return;
    }

    case 'sequence': {
      dispatch(action.steps, ctx);
      return;
    }

    case 'conditional': {
      const branch = evaluateExpr(action.condition, ctx.state.current, ctx.extraContext)
        ? action.then
        : (action.else ?? []);
      dispatch(branch, ctx);
      return;
    }

    case 'apiCall': {
      const url = expandTemplate(action.url, ctx.state.current, ctx.extraContext);
      const qs = action.queryParams
        ? '?' +
          Object.entries(action.queryParams)
            .map(
              ([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(expandTemplate(v, ctx.state.current, ctx.extraContext))}`
            )
            .join('&')
        : '';
      const body = action.bodyExpr
        ? evaluateExpr(action.bodyExpr, ctx.state.current, ctx.extraContext)
        : undefined;
      const headers = { 'Content-Type': 'application/json', ...(action.headers ?? {}) };

      fetch(url + qs, {
        method: action.method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: unknown) => {
          if (action.resultTarget) {
            const next = applyStateOperation(ctx.state.current, action.resultTarget, 'set', data);
            ctx.state.current = next;
            ctx.setState(next);
          }
          dispatch(action.onSuccess, ctx);
        })
        .catch(() => {
          dispatch(action.onError, ctx);
        });
      return;
    }
  }
}
