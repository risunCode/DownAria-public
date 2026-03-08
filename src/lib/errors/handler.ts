import {
  ErrorCategories,
  type ErrorCategory,
  getErrorCategory,
  getErrorMessage,
} from './codes';

export interface FrontendErrorPayload {
  code?: string;
  category?: ErrorCategory;
  message?: string;
  metadata?: Record<string, unknown>;
}

export const ErrorActionTypes = {
  RETRY: 'RETRY',
  WAIT_AND_RETRY: 'WAIT_AND_RETRY',
  CHECK_INPUT: 'CHECK_INPUT',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  GO_HOME: 'GO_HOME',
  DISMISS: 'DISMISS',
} as const;

export type ErrorActionType = typeof ErrorActionTypes[keyof typeof ErrorActionTypes];

export interface ErrorActionModel {
  type: ErrorActionType;
  label: string;
  primary?: boolean;
  retryAfterSeconds?: number;
}

export interface ErrorDisplayModel {
  category: ErrorCategory;
  title: string;
  message: string;
  actions: ErrorActionModel[];
}

export interface ErrorActionHandlers {
  onRetry?: () => void;
  onCheckInput?: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onDismiss?: () => void;
}

const CATEGORY_TITLES: Record<ErrorCategory, string> = {
  [ErrorCategories.NETWORK]: 'Network Error',
  [ErrorCategories.VALIDATION]: 'Invalid Request',
  [ErrorCategories.RATE_LIMIT]: 'Rate Limit Reached',
  [ErrorCategories.AUTH]: 'Authentication Required',
  [ErrorCategories.NOT_FOUND]: 'Content Not Found',
  [ErrorCategories.EXTRACTION_FAILED]: 'Extraction Failed',
};

const CATEGORY_ACTIONS: Record<ErrorCategory, ErrorActionType[]> = {
  [ErrorCategories.NETWORK]: [ErrorActionTypes.RETRY, ErrorActionTypes.DISMISS],
  [ErrorCategories.VALIDATION]: [ErrorActionTypes.CHECK_INPUT, ErrorActionTypes.DISMISS],
  [ErrorCategories.RATE_LIMIT]: [ErrorActionTypes.WAIT_AND_RETRY, ErrorActionTypes.DISMISS],
  [ErrorCategories.AUTH]: [ErrorActionTypes.OPEN_SETTINGS, ErrorActionTypes.DISMISS],
  [ErrorCategories.NOT_FOUND]: [ErrorActionTypes.GO_HOME, ErrorActionTypes.DISMISS],
  [ErrorCategories.EXTRACTION_FAILED]: [
    ErrorActionTypes.RETRY,
    ErrorActionTypes.OPEN_SETTINGS,
    ErrorActionTypes.DISMISS,
  ],
};

function toActionModel(action: ErrorActionType, metadata?: Record<string, unknown>): ErrorActionModel {
  if (action === ErrorActionTypes.RETRY) {
    return { type: action, label: 'Try Again', primary: true };
  }

  if (action === ErrorActionTypes.WAIT_AND_RETRY) {
    const retryAfterValue = metadata?.retryAfter;
    const retryAfterSeconds = typeof retryAfterValue === 'number' && retryAfterValue > 0
      ? Math.floor(retryAfterValue)
      : undefined;

    return {
      type: action,
      label: retryAfterSeconds ? `Retry in ${retryAfterSeconds}s` : 'Retry Soon',
      primary: true,
      retryAfterSeconds,
    };
  }

  if (action === ErrorActionTypes.CHECK_INPUT) {
    return { type: action, label: 'Check URL/Input', primary: true };
  }

  if (action === ErrorActionTypes.OPEN_SETTINGS) {
    return { type: action, label: 'Open Settings' };
  }

  if (action === ErrorActionTypes.GO_HOME) {
    return { type: action, label: 'Go to Home', primary: true };
  }

  return { type: ErrorActionTypes.DISMISS, label: 'Dismiss' };
}

export function createErrorDisplayModel(payload: FrontendErrorPayload): ErrorDisplayModel {
  const category = payload.category || getErrorCategory(payload.code);
  const title = CATEGORY_TITLES[category];
  const message = typeof payload.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : getErrorMessage(payload.code);
  const actions = CATEGORY_ACTIONS[category].map((action) => toActionModel(action, payload.metadata));

  return {
    category,
    title,
    message,
    actions,
  };
}

export function executeErrorAction(action: ErrorActionModel, handlers: ErrorActionHandlers): void {
  if (action.type === ErrorActionTypes.RETRY) {
    handlers.onRetry?.();
    return;
  }

  if (action.type === ErrorActionTypes.WAIT_AND_RETRY) {
    if (action.retryAfterSeconds && action.retryAfterSeconds > 0) {
      setTimeout(() => {
        handlers.onRetry?.();
      }, action.retryAfterSeconds * 1000);
      return;
    }

    handlers.onRetry?.();
    return;
  }

  if (action.type === ErrorActionTypes.CHECK_INPUT) {
    handlers.onCheckInput?.();
    return;
  }

  if (action.type === ErrorActionTypes.OPEN_SETTINGS) {
    handlers.onOpenSettings?.();
    return;
  }

  if (action.type === ErrorActionTypes.GO_HOME) {
    handlers.onGoHome?.();
    return;
  }

  handlers.onDismiss?.();
}
