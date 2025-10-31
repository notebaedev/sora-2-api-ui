export const OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB limit for worker uploads

export function createCorsHeaders(request: Request): Headers {
  const origin = request.headers.get('Origin') || '*';
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'authorization,content-type',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Max-Age': '86400',
  });

  if (origin === '*') {
    headers.set('Vary', 'Origin');
  }

  return headers;
}

export function applyCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  const cors = createCorsHeaders(request);
  cors.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function jsonResponse<T>(data: T, status: number, request: Request): Response {
  const headers = createCorsHeaders(request);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function errorResponse(message: string, status: number, request: Request, details?: Record<string, unknown>): Response {
  if (status >= 500) {
    console.error(message, details);
  } else {
    console.warn(message, details);
  }

  return jsonResponse({ error: message }, status, request);
}

export function buildOpenAIHeaders(apiKey: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('Authorization', `Bearer ${apiKey}`);
  return headers;
}

export async function cloneJson(response: Response): Promise<any | undefined> {
  try {
    const clone = response.clone();
    const text = await clone.text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch (error) {
    console.warn('Failed to parse JSON from OpenAI response', error);
    return undefined;
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function normalizePath(pathname: string): string {
  let normalized = pathname;
  if (normalized.startsWith('/api/')) {
    normalized = normalized.slice(4);
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
