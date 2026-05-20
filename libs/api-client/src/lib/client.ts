import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

interface ApiClientConfig {
  baseURL: string;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokenRefreshed: (accessToken: string) => void;
  onRefreshFailed: () => void;
  clientType?: 'web' | 'mobile';
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      ...(config.clientType === 'mobile' ? { 'X-Client-Type': 'mobile' } : {}),
    },
  });

  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

  const processQueue = (error: Error | null, token: string | null) => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error);
      else resolve(token!);
    });
    failedQueue = [];
  };

  // Request interceptor: attach token
  instance.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
    const token = config.getAccessToken();
    if (token && reqConfig.headers) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  });

  // Response interceptor: handle 401 with auto-refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Only auto-refresh on AUTH_002 (token expired), not other 401s
      const errorCode = (error.response?.data as any)?.error?.code;
      if (error.response?.status === 401 && errorCode === 'AUTH_002' && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: (token: string) => {
                originalRequest.headers!.Authorization = `Bearer ${token}`;
                resolve(instance(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshPayload = config.clientType === 'mobile'
            ? { refreshToken: config.getRefreshToken() }
            : {};

          const { data } = await axios.post(
            `${config.baseURL}/auth/refresh`,
            refreshPayload,
            { withCredentials: true },
          );

          const newToken = data.data?.accessToken || data.accessToken;
          config.onTokenRefreshed(newToken);
          processQueue(null, newToken);

          originalRequest.headers!.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError as Error, null);
          config.onRefreshFailed();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}
