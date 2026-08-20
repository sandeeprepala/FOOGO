import { API_BASE_URL } from '../constants';

/**
 * Custom HTTP client wrapper for FOO GO API Gateway
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('foogo_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Access token expired or invalid — try refresh
      const refreshToken = localStorage.getItem('foogo_refresh_token');
      if (refreshToken && !endpoint.includes('/auth/refresh')) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.accessToken) {
            localStorage.setItem('foogo_token', refreshData.accessToken);
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
            const retryRes = await fetch(url, { ...config, headers });
            return await parseResponse(retryRes);
          }
        }
      }
      // Refresh failed or no refresh token — clear auth state and throw typed error
      localStorage.removeItem('foogo_token');
      localStorage.removeItem('foogo_refresh_token');
      // Notify the app that auth has expired
      window.dispatchEvent(new CustomEvent('foogo:auth-expired'));
      const authErr = new Error('Session expired. Please log in again.');
      authErr.status = 401;
      throw authErr;
    }

    return await parseResponse(response);
  } catch (err) {
    // Rethrow typed errors (like our auth error above) as-is
    if (err.status) throw err;
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw new Error(err.message || 'Network error, please check connection.');
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `HTTP ${response.status} Error`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
