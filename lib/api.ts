const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const ensureLeadingSlash = (value: string): string =>
  value.startsWith('/') ? value : `/${value}`;

export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }

  return '/api';
}

export function getApiUrl(path: string): string {
  const baseUrl = stripTrailingSlash(getApiBaseUrl());
  const normalizedPath = ensureLeadingSlash(path);
  return `${baseUrl}${normalizedPath}`;
}
