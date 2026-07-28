import { AxiosError } from 'axios';

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, string[]>;
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as any;

    return {
      message: responseData?.detail || responseData?.message || 'An error occurred',
      code: responseData?.code,
      status: axiosError.response?.status,
      details: responseData?.errors,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}

export function getErrorMessage(error: unknown): string {
  const normalized = normalizeError(error);
  return normalized.message;
}

export function isNetworkError(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.code === 'NETWORK_ERROR' || normalized.status === undefined;
}

export function isUnauthorizedError(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.status === 404;
}

export function isValidationError(error: unknown): boolean {
  const normalized = normalizeError(error);
  return normalized.status === 400;
}