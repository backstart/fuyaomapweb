export function isRequestCanceled(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    code?: string;
    message?: string;
  };

  return (
    candidate.name === 'CanceledError' ||
    candidate.name === 'AbortError' ||
    candidate.code === 'ERR_CANCELED' ||
    candidate.message === 'canceled'
  );
}
