import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile, useUpdateProfile } from '../hooks/use-profile';
import { useNotificationSettings } from '../stores/notification-settings.store';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(20, '이름은 최대 20자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z\s\-'.]+$/, '이름은 한글, 영문, 공백, 하이픈(-)만 입력 가능합니다'),
  phone: z
    .string()
    .regex(
      /^01[0-9]-\d{3,4}-\d{4}$/,
      '유효한 휴대폰 번호를 입력해주세요 (예: 010-1234-5678)',
    )
    .or(z.literal(''))
    .nullable()
    .optional(),
});

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

type ProfileFormData = z.infer<typeof profileSchema>;

interface ToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

function Toggle({ label, enabled, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary-500' : 'bg-neutral-300'
        }`}
        aria-label={`${label} ${enabled ? '끄기' : '켜기'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function NotificationSettingsSection() {
  const {
    assessmentAlerts,
    curriculumAlerts,
    weeklyInsights,
    inputReminders,
    setPreference,
  } = useNotificationSettings();

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">알림 설정</h3>
      <p className="text-sm text-neutral-500 mb-4">
        받고 싶은 알림을 선택하세요.
      </p>
      <div className="divide-y divide-neutral-100">
        <Toggle
          label="평가 알림"
          enabled={assessmentAlerts}
          onToggle={() => setPreference('assessmentAlerts', !assessmentAlerts)}
        />
        <Toggle
          label="커리큘럼 알림"
          enabled={curriculumAlerts}
          onToggle={() => setPreference('curriculumAlerts', !curriculumAlerts)}
        />
        <Toggle
          label="주간 인사이트"
          enabled={weeklyInsights}
          onToggle={() => setPreference('weeklyInsights', !weeklyInsights)}
        />
        <Toggle
          label="입력 리마인더"
          enabled={inputReminders}
          onToggle={() => setPreference('inputReminders', !inputReminders)}
        />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(
      {
        name: data.name,
        phone: data.phone || null,
      },
      {
        onSuccess: () => {
          setToast({ type: 'success', message: '프로필이 저장되었습니다.' });
        },
        onError: () => {
          setToast({ type: 'error', message: '프로필 저장에 실패했습니다.' });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-40 bg-neutral-200 rounded animate-pulse" />
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-4">
          <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
          <div className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
          <div className="h-5 w-24 bg-neutral-200 rounded animate-pulse" />
          <div className="h-12 bg-neutral-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-[fadeIn_0.2s_ease-out] ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-neutral-800">프로필 설정</h1>
        <p className="text-sm text-neutral-500 mt-1">
          계정 정보를 확인하고 수정하세요.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">
                {profile?.name}
              </h2>
              <p className="text-sm text-neutral-500">{profile?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                {profile?.role === 'ADMIN' ? '관리자' : '사용자'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
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
              placeholder="이름"
              className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-neutral-200'
              }`}
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.name.message}
              </p>
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
              value={profile?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500 cursor-not-allowed"
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              이메일은 변경할 수 없습니다.
            </p>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-neutral-700 mb-1.5"
            >
              휴대폰 번호
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="010-1234-5678"
              className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                errors.phone
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-neutral-200'
              }`}
              {...register('phone')}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                e.target.value = formatted;
                register('phone').onChange(e);
              }}
              maxLength={13}
            />
            {errors.phone && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!isDirty || updateProfile.isPending}
              className="px-6 py-3 rounded-lg bg-primary-500 text-white font-semibold shadow-sm shadow-primary-200/50 hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
            >
              {updateProfile.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  저장 중...
                </span>
              ) : (
                '변경사항 저장'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          비밀번호 변경
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          보안을 위해 정기적으로 비밀번호를 변경해주세요.
        </p>
        <button
          disabled
          className="px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-400 cursor-not-allowed"
        >
          비밀번호 변경 (준비 중)
        </button>
      </div>

      <NotificationSettingsSection />
    </div>
  );
}
