import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  familyId: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface ApiErrorData {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<{ success: true; data: AuthResponse }>('/auth/login', input);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      navigate('/dashboard');
    },
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<{ success: true; data: AuthResponse }>(
        '/auth/register',
        input,
      );
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      navigate('/dashboard');
    },
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const doLogout = () => {
    clearAuth();
    queryClient.clear();
    navigate('/login');
  };

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: doLogout,
    onError: doLogout,
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as ApiErrorData;
    const code = data.error?.code;

    switch (code) {
      case 'AUTH_001':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'AUTH_003':
        return '계정이 비활성화되었습니다. 관리자에게 문의하세요.';
      case 'AUTH_007':
        return '이미 등록된 이메일 주소입니다.';
      default:
        return data.error?.message || '로그인 중 오류가 발생했습니다.';
    }
  }
  return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
}
