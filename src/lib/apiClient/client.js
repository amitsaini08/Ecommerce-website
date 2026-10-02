import { getSocket } from '@/lib/socket';

export class ApiError extends Error {
  constructor(message, { status = 0, field = null, errors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
    this.errors = errors;
  }
}

async function request(method, url, { body, headers: customHeaders, signal } = {}) {
  const hasBody = body !== undefined;
  
  let socketId;
  try {
    if (typeof window !== 'undefined') {
      const socket = getSocket();
      if (socket && socket.id) socketId = socket.id;
    }
  } catch {}
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(socketId ? { 'x-socket-id': socketId } : {}),
    ...customHeaders,
  };
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Network error. Please check your connection.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      data?.error || data?.message ||
        (res.status >= 500 ? 'Something went wrong on our side.' : 'Request failed'),
      { status: res.status, field: data?.field, errors: data?.errors }
    );
  }
  return data;
}
export const api = {
  get: (url, opts) => request('GET', url, opts),
  post: (url, body, opts) => request('POST', url, { ...opts, body }),
  put: (url, body, opts) => request('PUT', url, { ...opts, body }),
  patch: (url, body, opts) => request('PATCH', url, { ...opts, body }),
  del: (url, opts) => request('DELETE', url, opts),
};
