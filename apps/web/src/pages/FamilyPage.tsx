import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useMyFamily,
  useCreateFamily,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  FamilyMember,
} from '../hooks/use-families';
import { useAuthStore } from '../stores/auth.store';
import { Skeleton, ErrorState, EmptyState, PageHeader } from '../components/ui';

const createFamilySchema = z.object({
  name: z
    .string()
    .min(1, '가족 이름을 입력해주세요')
    .max(50, '가족 이름은 최대 50자까지 가능합니다'),
});

const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요')
    .email('올바른 이메일 형식이 아닙니다'),
  role: z.enum(['FAMILY_ADMIN', 'FAMILY_MEMBER']),
});

type CreateFamilyData = z.infer<typeof createFamilySchema>;
type InviteMemberData = z.infer<typeof inviteMemberSchema>;

export function FamilyPage() {
  const { user } = useAuthStore();
  const { data: family, isLoading, isError, refetch } = useMyFamily();
  const createFamily = useCreateFamily();
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = family?.members?.some(
    (m: FamilyMember) => m.userId === user?.id && m.role === 'FAMILY_ADMIN',
  );

  const createFamilyForm = useForm<CreateFamilyData>({
    resolver: zodResolver(createFamilySchema),
  });

  const inviteForm = useForm<InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'FAMILY_MEMBER' },
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const onCreateFamily = (data: CreateFamilyData) => {
    createFamily.mutate(data, {
      onSuccess: () => showToast('success', '가족이 생성되었습니다.'),
      onError: () => showToast('error', '가족 생성에 실패했습니다.'),
    });
  };

  const onInviteMember = (data: InviteMemberData) => {
    if (!family) return;
    inviteMember.mutate(
      { familyId: family.id, input: data },
      {
        onSuccess: () => {
          showToast('success', '멤버가 초대되었습니다.');
          inviteForm.reset();
          setShowInviteForm(false);
        },
        onError: () => showToast('error', '멤버 초대에 실패했습니다.'),
      },
    );
  };

  const handleRoleChange = (memberId: string, role: 'FAMILY_ADMIN' | 'FAMILY_MEMBER') => {
    if (!family) return;
    updateMemberRole.mutate(
      { familyId: family.id, memberId, input: { role } },
      {
        onSuccess: () => showToast('success', '역할이 변경되었습니다.'),
        onError: () => showToast('error', '역할 변경에 실패했습니다.'),
      },
    );
  };

  const handleRemoveMember = (memberId: string) => {
    if (!family) return;
    removeMember.mutate(
      { familyId: family.id, memberId },
      {
        onSuccess: () => {
          showToast('success', '멤버가 제거되었습니다.');
          setConfirmDelete(null);
        },
        onError: () => showToast('error', '멤버 제거에 실패했습니다.'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton height="h-8" className="w-40" rounded="rounded-lg" />
        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <Skeleton height="h-6" className="w-48" />
          <Skeleton height="h-16" className="w-full" rounded="rounded-lg" />
          <Skeleton height="h-16" className="w-full" rounded="rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto">
        <ErrorState
          title="가족 정보를 불러올 수 없습니다"
          message="네트워크 상태를 확인 후 다시 시도해주세요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="가족 관리"
          subtitle="가족을 생성하여 함께 관리해보세요."
        />

        <div className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm p-8 text-center">
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
            title="아직 가족이 없습니다"
            description="가족을 생성하면 멤버를 초대하고 아이 정보를 함께 관리할 수 있습니다."
          />

          <form
            onSubmit={createFamilyForm.handleSubmit(onCreateFamily)}
            className="max-w-sm mx-auto space-y-3 mt-4"
          >
            <input
              placeholder="가족 이름 (예: 우리 가족)"
              className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                createFamilyForm.formState.errors.name
                  ? 'border-red-300'
                  : 'border-neutral-200'
              }`}
              {...createFamilyForm.register('name')}
            />
            {createFamilyForm.formState.errors.name && (
              <p className="text-xs text-red-500">
                {createFamilyForm.formState.errors.name.message}
              </p>
            )}
            <button
              type="submit"
              disabled={createFamily.isPending}
              className="w-full py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold shadow-sage-sm hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
            >
              {createFamily.isPending ? '생성 중...' : '가족 생성'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-sage-lg border text-sm font-medium animate-fade-in ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      <PageHeader
        title="가족 관리"
        subtitle="가족 멤버를 관리하고 역할을 설정하세요."
      />

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">
              {family.name}
            </h2>
            <p className="text-sm text-neutral-500">
              멤버 {family.members?.length || 0}명
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              멤버 초대
            </button>
          )}
        </div>

        {showInviteForm && isAdmin && (
          <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
            <form
              onSubmit={inviteForm.handleSubmit(onInviteMember)}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    placeholder="초대할 멤버 이메일"
                    className={`w-full px-4 py-2.5 rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm ${
                      inviteForm.formState.errors.email
                        ? 'border-red-300'
                        : 'border-neutral-200'
                    }`}
                    {...inviteForm.register('email')}
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {inviteForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <select
                  className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  {...inviteForm.register('role')}
                >
                  <option value="FAMILY_MEMBER">멤버</option>
                  <option value="FAMILY_ADMIN">관리자</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviteMember.isPending}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  {inviteMember.isPending ? '초대 중...' : '초대'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    inviteForm.reset();
                  }}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-neutral-100">
          {family.members?.map((member: FamilyMember) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 px-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-sm font-bold">
                  {member.user.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-700">
                      {member.user.name}
                    </p>
                    {member.role === 'FAMILY_ADMIN' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary-100 text-primary-700 uppercase">
                        관리자
                      </span>
                    )}
                    {member.userId === user?.id && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-500">
                        나
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">{member.user.email}</p>
                </div>
              </div>

              {isAdmin && member.userId !== user?.id && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(
                        member.id,
                        e.target.value as 'FAMILY_ADMIN' | 'FAMILY_MEMBER',
                      )
                    }
                    className="px-2 py-1.5 rounded border border-neutral-200 text-xs text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="FAMILY_MEMBER">멤버</option>
                    <option value="FAMILY_ADMIN">관리자</option>
                  </select>

                  {confirmDelete === member.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors min-h-[44px] flex items-center"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 rounded text-xs font-medium border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors min-h-[44px] flex items-center"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(member.id)}
                      className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="멤버 제거"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
