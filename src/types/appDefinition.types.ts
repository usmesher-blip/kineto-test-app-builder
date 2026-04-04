export type AppDefinitionV2 = {
  id: string;
  name: string;
  description: string;
  model: {
    schema: Record<string, ModelField>;
    initialState: Record<string, ModelField> | null;
  };
  actions: Record<string, Action>;
  view: {
    defaultPageId: string;
    pages: Page[];
  };
};

// -------------- MODEL ----------------
// model is used for declarative state description, used as core data part in both actions and views

// actual state which app has in runtime
export type AppState = {
  state: Record<string, ModelField>;
};

export type ModelField =
  | { type: 'string' | 'number' | 'boolean' | 'null'; value: unknown }
  | { type: 'object'; properties: Record<string, ModelField> }
  | { type: 'array'; items: ModelField }
  | { type: 'ref'; ref: string }; // reference another model by name

// -------------- ACTIONS ----------------
// actions are fired from ViewElements or from ApiCalls and changing the state of application

export type Action =
  | StateUpdateAction
  | ApiCallAction
  | NavigateAction
  | SequenceAction
  | ConditionalAction;

export type StateUpdateAction = {
  type: 'stateUpdate';
  target: string; // dot-path into state, e.g. "todos.items"
  operation: 'set' | 'push' | 'remove' | 'patch' | 'filter' | 'sort';
  valueExpr: string; // expression or literal, e.g. "!state.ui.darkMode"
  condition?: string; // guard expression
};

export type NavigateAction = {
  type: 'navigate';
  pageId: string;
  params?: Record<string, string>; // state expressions
};

export type ApiCallAction = {
  type: 'apiCall';
  api: string; // references top-level api's config
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string; // supports {{expr}} templating
  queryParams?: Record<string, string>; // expressions, appended as ?key=value
  bodyExpr?: string; // expression for request body
  headers?: Record<string, string>;
  resultTarget?: string; // where to store response
  onSuccess: ActionRef[];
  onError: ActionRef[];
  onProgress?: ActionRef[]; // for uploads
};

export type SequenceAction = {
  type: 'sequence';
  steps: ActionRef[]; // ordered list of action ids
};

export type ConditionalAction = {
  type: 'conditional';
  condition: string; // boolean expression
  then: ActionRef[];
  else?: ActionRef[];
};

export type ActionRef = { actionId: string; argBindings?: Record<string, string> };

// -------------- VIEW ----------------
// we are going to render react element from this part of configuration

export type Page = {
  id: string;
  name: string;
  url: string; // supports params: "/users/:id"
  authRequired?: boolean;
  redirectIfAuth?: string; // pageId — useful for login page
  onMount?: ActionRef[]; // load data when page opens
  elements: ViewElement[];
  layout?: 'default' | 'sidebar' | 'fullscreen';
};

export type ViewElement = {
  id: string;
  type:
    | 'text'
    | 'input'
    | 'checkbox'
    | 'date'
    | 'dropdown'
    | 'button'
    | 'panel'
    | 'list'
    | 'form'
    | 'table'
    | 'image';

  // Data binding
  source?: string; // read from state: "state.user.name"

  // Events → actions
  events?: {
    onClick?: ActionRef[];
    onChange?: ActionRef[]; // for inputs, fires with new value
    onSubmit?: ActionRef[]; // for forms
    onMount?: ActionRef[]; // initialization
  };

  // For inputs: where to write the value
  target?: string; // write to state: "state.form.email"

  // Conditional visibility
  visibleWhen?: string; // expression: "state.user.isLoggedIn"

  // For list elements: per-item expression evaluated with `item` and `index` in scope.
  // Items where expression is falsy are hidden — state array is never mutated.
  // e.g. "state.ui.filter === 'all' || item.done === (state.ui.filter === 'done')"
  filterExpr?: string;

  // Layout/style hints (enough for LLM to be intentional)
  layout?: 'row' | 'column' | 'grid';
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  label?: string;
  placeholder?: string;

  children?: ViewElement[];
};
