import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { useRegister, getAuthErrorMessage } from '../../hooks/use-auth';

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, '이름을 입력해주세요.')
      .min(2, '이름은 2자 이상이어야 합니다.')
      .max(20, '이름은 20자 이하여야 합니다.'),
    email: z
      .string()
      .min(1, '이메일을 입력해주세요.')
      .email('올바른 이메일 형식이 아닙니다.'),
    password: z
      .string()
      .min(1, '비밀번호를 입력해주세요.')
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        '비밀번호는 영문과 숫자를 포함해야 합니다.',
      ),
    passwordConfirm: z.string().min(1, '비밀번호를 다시 입력해주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function PasswordStrength({ password }: { password: string }) {
  const getStrength = (): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: '약함', color: 'bg-red-400' };
    if (score <= 2) return { level: 2, label: '보통', color: 'bg-amber-400' };
    if (score <= 3) return { level: 3, label: '좋음', color: 'bg-primary-400' };
    return { level: 4, label: '강함', color: 'bg-emerald-500' };
  };

  const { level, label, color } = getStrength();
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= level ? color : 'bg-neutral-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-neutral-500 mt-1">비밀번호 강도: {label}</p>
    </div>
  );
}

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <AuthLayout title="회원가입" subtitle="AutiCare에 오신 것을 환영합니다">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {registerMutation.isError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 animate-[fadeIn_0.2s_ease-out]">
            {getAuthErrorMessage(registerMutation.error)}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            이름
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="이름"
            className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
              errors.name
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-neutral-200'
            }`}
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="이메일 주소"
            className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
              errors.email
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-neutral-200'
            }`}
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="비밀번호 (8자 이상, 영문+숫자)"
              className={`w-full px-4 py-3 pr-12 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                errors.password
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-neutral-200'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
          <PasswordStrength password={passwordValue} />
        </div>

        <div>
          <label
            htmlFor="passwordConfirm"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
              errors.passwordConfirm
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-neutral-200'
            }`}
            {...register('passwordConfirm')}
          />
          {errors.passwordConfirm && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.passwordConfirm.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold shadow-sm shadow-primary-200/50 hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
        >
          {registerMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              가입 중...
            </span>
          ) : (
            '회원가입'
          )}
        </button>

        <p className="text-center text-sm text-neutral-500">
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
          >
            로그인
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
