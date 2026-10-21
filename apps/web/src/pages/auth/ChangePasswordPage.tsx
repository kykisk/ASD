import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useChildStore } from '../../stores/child.store';

const schema = z
  .object({
    currentPassword: z.string().min(1, '지금 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '8자 이상이어야 합니다.')
      .regex(/[A-Z]/, '대문자를 포함해주세요.')
      .regex(/[a-z]/, '소문자를 포함해주세요.')
      .regex(/[0-9]/, '숫자를 포함해주세요.')
      .regex(/[^A-Za-z0-9]/, '특수문자를 포함해주세요.'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: '새 비밀번호가 서로 달라요.',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
    hasError ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-neutral-200'
  }`;

/**
 * 비밀번호 바꾸기. 관리자가 임시 비밀번호를 발급한 계정(mustChangePassword)은
 * 로그인 직후 여기로 와서 새 비밀번호를 정해야 다른 화면을 쓸 수 있다.
 * 바꾸면 모든 기기에서 로그아웃되므로 새 비밀번호로 다시 로그인한다.
 */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearSelectedChild = useChildStore((s) => s.clearSelectedChild);
  const forced = !!user?.mustChangePassword;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const signOut = () => {
    clearAuth();
    clearSelectedChild();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setDone(true);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setError(msg ?? '비밀번호를 바꾸지 못했어요. 다시 시도해주세요.');
    }
  };

  if (done) {
    return (
      <AuthLayout title="비밀번호를 바꿨어요" subtitle="새 비밀번호로 다시 로그인해주세요">
        <button
          type="button"
          onClick={signOut}
          className="w-full py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
        >
          로그인하러 가기
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={forced ? '새 비밀번호를 정해주세요' : '비밀번호 바꾸기'}
      subtitle={
        forced
          ? '관리자가 보내드린 임시 비밀번호로 로그인하셨어요. 앞으로 쓸 비밀번호를 정하면 바로 시작할 수 있어요.'
          : '지금 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            {forced ? '임시 비밀번호' : '지금 비밀번호'}
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            autoFocus
            className={inputClass(!!errors.currentPassword)}
            {...register('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="mt-1.5 text-xs text-red-500">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            새 비밀번호
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass(!!errors.newPassword)}
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p className="mt-1.5 text-xs text-red-500">{errors.newPassword.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-neutral-400">
              8자 이상 · 대문자 · 소문자 · 숫자 · 특수문자
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-neutral-700 mb-1.5">
            새 비밀번호 확인
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className={inputClass(!!errors.confirm)}
            {...register('confirm')}
          />
          {errors.confirm && (
            <p className="mt-1.5 text-xs text-red-500">{errors.confirm.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? '바꾸는 중...' : '비밀번호 바꾸기'}
        </button>

        <p className="text-center text-sm text-neutral-500">
          {forced ? (
            <button type="button" onClick={signOut} className="text-primary-600 font-medium">
              나중에 하기 (로그아웃)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-primary-600 font-medium"
            >
              돌아가기
            </button>
          )}
        </p>
      </form>
    </AuthLayout>
  );
}
