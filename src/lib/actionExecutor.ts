import type { AppDefinitionV2, Action, ActionRef } from '@/types/appDefinition.types';
import { evaluateExpr, expandTemplate, applyStateOperation } from './expressionEvaluator';

export type RuntimeContext = {
  definition: AppDefinitionV2;
  state: Record<string, unknown>;
  setState: (s: Record<string, unknown>) => void;
  navigate: (pageId: string, params?: Record<string, string>) => void;
  extraContext: Record<string, unknown>;
};

export function executeActionRef(ref: ActionRef, ctx: RuntimeContext): Record<string, unknown> {
  const action = ctx.definition.actions[ref.actionId];
  if (!action) {
    console.warn(`[ActionExecutor] Unknown action: "${ref.actionId}"`);
    return {};
  }

  return executeAction(action, ctx);
}

export function executeAction(action: Action, ctx: RuntimeContext): Record<string, unknown> {
  switch (action.type) {
    case 'stateUpdate': {
      if (action.condition) {
        const cond = evaluateExpr(action.condition, ctx.state, ctx.extraContext);
        if (!cond) return ctx.state;
      }

      const value = evaluateExpr(action.valueExpr, ctx.state, ctx.extraContext);
      const newState = applyStateOperation(ctx.state, action.target, action.operation, value);
      ctx.setState(newState);
      return newState;
    }

    case 'navigate': {
      ctx.navigate(action.pageId, action.params);
      return ctx.state;
    }

    case 'sequence': {
      for (const ref of action.steps) {
        ctx.state = executeActionRef(ref, ctx);
      }
      return ctx.state;
    }

    case 'conditional': {
      const cond = evaluateExpr(action.condition, ctx.state, ctx.extraContext);
      const branch = cond ? action.then : (action.else ?? []);
      for (const ref of branch) {
        executeActionRef(ref, ctx);
      }
      return ctx.state;
    }

    case 'apiCall': {
      const url = expandTemplate(action.url, ctx.state, ctx.extraContext);
      const queryString = action.queryParams
        ? '?' +
          Object.entries(action.queryParams)
            .map(
              ([k, v]) =>
                `${encodeURIComponent(k)}=${encodeURIComponent(
                  expandTemplate(v, ctx.state, ctx.extraContext)
                )}`
            )
            .join('&')
        : '';

      const bodyData = action.bodyExpr
        ? evaluateExpr(action.bodyExpr, ctx.state, ctx.extraContext)
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(action.headers ?? {}),
      };

      // Capture state snapshot for callbacks
      const capturedState = ctx.state;

      fetch(url + queryString, {
        method: action.method,
        headers,
        body: bodyData != null ? JSON.stringify(bodyData) : undefined,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: unknown) => {
          let newState = capturedState;
          if (action.resultTarget) {
            newState = applyStateOperation(newState, action.resultTarget, 'set', data);
            ctx.setState(newState);
          }
          for (const ref of action.onSuccess) {
            executeActionRef(ref, { ...ctx, state: newState });
          }
        })
        .catch(() => {
          for (const ref of action.onError) {
            executeActionRef(ref, { ...ctx, state: capturedState });
          }
        });
      return ctx.state;
    }
  }
}
