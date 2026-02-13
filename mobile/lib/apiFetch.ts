const API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
  retries = 3
): Promise<Response> {
  const url = getApiUrl(path);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });

      if (response.status === 503 && attempt < retries - 1) {
        const delay = 1000 * (attempt + 1);
        console.log(`[API] 503 on ${path}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries - 1) {
        const delay = 1000 * (attempt + 1);
        console.log(`[API] Network error on ${path}, retrying in ${delay}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${path} after ${retries} attempts`);
}
