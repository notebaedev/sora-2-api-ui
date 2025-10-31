import {
  OPENAI_BASE_URL,
  MAX_UPLOAD_BYTES,
  applyCors,
  arrayBufferToBase64,
  buildOpenAIHeaders,
  cloneJson,
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  normalizePath,
} from './utils';

interface Env {}

type Handler = (request: Request, env: Env) => Promise<Response>;

const routes: Record<string, Handler> = {
  '/videos/create': handleCreate,
  '/videos/status': handleStatus,
  '/videos/download': handleDownload,
  '/videos/list': handleList,
  '/videos/delete': handleDelete,
  '/videos/remix': handleRemix,
};

function notFound(request: Request): Response {
  return errorResponse('Not found', 404, request);
}

function handleOptions(request: Request): Response {
  const headers = createCorsHeaders(request);
  return new Response(null, { status: 204, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    const normalizedPath = normalizePath(url.pathname);

    const handler = routes[normalizedPath as keyof typeof routes];
    if (!handler) {
      return notFound(request);
    }

    try {
      const response = await handler(request, env);
      return response;
    } catch (error) {
      console.error('Unhandled worker error', error);
      return errorResponse('Internal server error', 500, request);
    }
  },
};

async function handleCreate(request: Request): Promise<Response> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isNaN(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
      return errorResponse('Upload exceeds maximum size of 25MB', 413, request);
    }
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.warn('Invalid multipart form data', error);
    return errorResponse('Invalid form data payload', 400, request);
  }

  const apiKey = formData.get('apiKey');
  const prompt = formData.get('prompt');
  const model = formData.get('model');
  const size = formData.get('size');
  const seconds = formData.get('seconds');
  const inputReference = formData.get('inputReference');

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return errorResponse('Prompt is required', 400, request);
  }

  if (typeof model !== 'string' || typeof size !== 'string' || typeof seconds !== 'string') {
    return errorResponse('Model, size, and seconds are required', 400, request);
  }

  const openAiFormData = new FormData();
  openAiFormData.append('prompt', prompt);
  openAiFormData.append('model', model);
  openAiFormData.append('size', size);
  openAiFormData.append('seconds', seconds);

  if (inputReference instanceof File) {
    openAiFormData.append('input_reference', inputReference);
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos`, {
    method: 'POST',
    headers: buildOpenAIHeaders(apiKey),
    body: openAiFormData,
  });

  if (!response.ok) {
    const data = await cloneJson(response);
    const errorMessage = data?.error?.message || data?.error || 'Failed to create video';
    return errorResponse(errorMessage, response.status || 500, request, data);
  }

  return applyCors(response, request);
}

async function handleStatus(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Invalid JSON payload for status endpoint', error);
    return errorResponse('Invalid JSON payload', 400, request);
  }

  const { apiKey, videoId } = body ?? {};

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  if (typeof videoId !== 'string' || videoId.trim().length === 0) {
    return errorResponse('Video ID is required', 400, request);
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos/${videoId}`, {
    method: 'GET',
    headers: buildOpenAIHeaders(apiKey),
  });

  if (!response.ok) {
    const data = await cloneJson(response);
    const message = data?.error?.message || data?.error || 'Failed to retrieve video status';

    if (response.status >= 500) {
      return jsonResponse(
        {
          id: videoId,
          status: 'in_progress',
          retry: true,
          tempError: message,
        },
        200,
        request,
      );
    }

    return errorResponse(message, response.status || 500, request, data);
  }

  const data = await response.json();
  return jsonResponse(data, response.status, request);
}

async function handleDownload(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Invalid JSON payload for download endpoint', error);
    return errorResponse('Invalid JSON payload', 400, request);
  }

  const { apiKey, videoId, variant } = body ?? {};

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  if (typeof videoId !== 'string' || videoId.trim().length === 0) {
    return errorResponse('Video ID is required', 400, request);
  }

  const url = new URL(`${OPENAI_BASE_URL}/videos/${encodeURIComponent(videoId)}/content`);
  if (variant) {
    url.searchParams.set('variant', variant);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildOpenAIHeaders(apiKey),
  });

  if (!response.ok) {
    const data = await cloneJson(response);
    const message = data?.error?.message || data?.error || 'Failed to download video';
    return errorResponse(message, response.status || 500, request, data);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const contentType = response.headers.get('Content-Type') || inferContentType(variant);

  return jsonResponse({ data: base64, contentType }, 200, request);
}

async function handleList(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Invalid JSON payload for list endpoint', error);
    return errorResponse('Invalid JSON payload', 400, request);
  }

  const { apiKey, limit, after } = body ?? {};

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  const params = new URLSearchParams();
  if (typeof limit === 'number' || typeof limit === 'string') {
    params.set('limit', String(limit));
  }
  if (typeof after === 'string' && after.trim().length > 0) {
    params.set('after', after);
  }

  const query = params.toString();
  const endpoint = query ? `${OPENAI_BASE_URL}/videos?${query}` : `${OPENAI_BASE_URL}/videos`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: buildOpenAIHeaders(apiKey),
  });

  const data = await response.json().catch(() => undefined);

  if (!response.ok || !data) {
    const message = data?.error?.message || data?.error || 'Failed to list videos';
    return errorResponse(message, response.status || 500, request, data);
  }

  return jsonResponse(data, response.status, request);
}

async function handleDelete(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Invalid JSON payload for delete endpoint', error);
    return errorResponse('Invalid JSON payload', 400, request);
  }

  const { apiKey, videoId } = body ?? {};

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  if (typeof videoId !== 'string' || videoId.trim().length === 0) {
    return errorResponse('Video ID is required', 400, request);
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: buildOpenAIHeaders(apiKey),
  });

  if (!response.ok) {
    const data = await cloneJson(response);
    const message = data?.error?.message || data?.error || 'Failed to delete video';
    return errorResponse(message, response.status || 500, request, data);
  }

  return jsonResponse({ success: true }, 200, request);
}

async function handleRemix(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Invalid JSON payload for remix endpoint', error);
    return errorResponse('Invalid JSON payload', 400, request);
  }

  const { apiKey, videoId, prompt } = body ?? {};

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return errorResponse('API key is required', 400, request);
  }

  if (typeof videoId !== 'string' || videoId.trim().length === 0) {
    return errorResponse('Video ID is required', 400, request);
  }

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return errorResponse('Remix prompt is required', 400, request);
  }

  const response = await fetch(`${OPENAI_BASE_URL}/videos/${encodeURIComponent(videoId)}/remix`, {
    method: 'POST',
    headers: buildOpenAIHeaders(apiKey, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const data = await cloneJson(response);
    const message = data?.error?.message || data?.error || 'Failed to remix video';
    return errorResponse(message, response.status || 500, request, data);
  }

  const data = await response.json();
  return jsonResponse(data, response.status, request);
}

function inferContentType(variant?: string): string {
  if (variant === 'thumbnail') {
    return 'image/webp';
  }
  if (variant === 'spritesheet') {
    return 'image/jpeg';
  }
  return 'video/mp4';
}
