import { useState } from 'react';
import { useChildStore } from '../stores/child.store';
import { useMyFamily } from '../hooks/use-families';
import { useChildren } from '../hooks/use-children';
import { useAuthStore } from '../stores/auth.store';
import {
  useRoleAssignments,
  useAssignRole,
  useCompleteRole,
  RoleAssignment,
} from '../hooks/use-collaboration';
import { PageHeader, ErrorState, EmptyState, LoadingSpinner } from '../components/ui';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return '오늘';
  if (date.getTime() === tomorrow.getTime()) return '내일';
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
}

export function FamilyCollaborationPage() {
  const { user } = useAuthStore();
  const { data: family, isLoading: familyLoading } = useMyFamily();
  const { data: children } = useChildren(family?.id);
  const { selectedChildId } = useChildStore();

  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const { data: roles, isLoading, isError, refetch } = useRoleAssignments(family?.id, selectedDate);
  const assignRole = useAssignRole(family?.id);
  const completeRole = useCompleteRole();

  const [showModal, setShowModal] = useState(false);
  const [roleForm, setRoleForm] = useState({
    assignedTo: '',
    childId: '',
    title: '',
    description: '',
    date: selectedDate,
  });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDate(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDate(d));
  };

  const handleComplete = (roleId: string) => {
    completeRole.mutate(roleId, {
      onSuccess: () => showToast('완료 처리되었습니다.'),
      onError: () => showToast('완료 처리에 실패했습니다.'),
    });
  };

  const handleAssign = () => {
    if (!roleForm.title || !roleForm.assignedTo) return;
    assignRole.mutate(
      {
        assignedTo: roleForm.assignedTo,
        childId: roleForm.childId || undefined,
        title: roleForm.title,
        description: roleForm.description || undefined,
        date: roleForm.date,
      },
      {
        onSuccess: () => {
          showToast('역할이 배정되었습니다.');
          setShowModal(false);
          setRoleForm({
            assignedTo: '',
            childId: '',
            title: '',
            description: '',
            date: selectedDate,
          });
        },
        onError: () => showToast('역할 배정에 실패했습니다.'),
      },
    );
  };

  if (familyLoading || isLoading) return <LoadingSpinner fullPage />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (!family) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          title="가족을 먼저 생성해주세요"
          description="가족 관리에서 가족을 만든 후 협업 기능을 이용할 수 있습니다."
        />
      </div>
    );
  }

  const members = family.members || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-20 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <PageHeader
        title="가족 협업"
        subtitle="역할을 분담하고 함께 참여하세요."
        action={
          <button
            onClick={() => {
              setRoleForm({ ...roleForm, date: selectedDate });
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 shadow-sage-sm transition-colors min-h-[44px]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            역할 추가
          </button>
        }
      />

      {/* Date Picker */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-800">{formatDateLabel(selectedDate)}</p>
          <p className="text-xs text-neutral-400">{selectedDate}</p>
        </div>
        <button
          onClick={handleNextDay}
          className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Roles List */}
      {roles && roles.length > 0 ? (
        <div className="space-y-3">
          {roles.map((role: RoleAssignment) => {
            const isOwnRole = role.assignedTo === user?.id;
            const isCompleted = !!role.completedAt;

            return (
              <div
                key={role.id}
                className={`bg-white rounded-xl border border-[#E8E4DF] p-4 flex items-center gap-4 transition-all ${
                  isCompleted ? 'opacity-60' : ''
                }`}
              >
                <button
                  onClick={() => !isCompleted && isOwnRole && handleComplete(role.id)}
                  disabled={!isOwnRole || isCompleted}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isCompleted
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : isOwnRole
                        ? 'border-primary-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer'
                        : 'border-neutral-200 bg-neutral-50 cursor-not-allowed'
                  }`}
                >
                  {isCompleted && (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${isCompleted ? 'line-through text-neutral-400' : 'text-neutral-800'}`}
                  >
                    {role.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500">{role.user?.name || '미정'}</span>
                    {role.child && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                        {role.child.name}
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs text-neutral-400 mt-1">{role.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="배정된 역할이 없습니다"
          description="역할 추가 버튼으로 새 역할을 배정해보세요."
          action={{
            label: '+ 역할 추가',
            onClick: () => {
              setRoleForm({ ...roleForm, date: selectedDate });
              setShowModal(true);
            },
          }}
        />
      )}

      {/* Assign Role Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-sage-lg border border-neutral-200 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-800">역할 추가</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  담당자 <span className="text-red-400">*</span>
                </label>
                <select
                  value={roleForm.assignedTo}
                  onChange={(e) => setRoleForm({ ...roleForm, assignedTo: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">선택하세요</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  역할 제목 <span className="text-red-400">*</span>
                </label>
                <input
                  value={roleForm.title}
                  onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
                  placeholder="예: 오후 산책"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  아이 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <select
                  value={roleForm.childId}
                  onChange={(e) => setRoleForm({ ...roleForm, childId: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  <option value="">선택 안함</option>
                  {children?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  설명 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="상세 설명..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">날짜</label>
                <input
                  type="date"
                  value={roleForm.date}
                  onChange={(e) => setRoleForm({ ...roleForm, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAssign}
                  disabled={assignRole.isPending || !roleForm.title || !roleForm.assignedTo}
                  className="flex-1 py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {assignRole.isPending ? '저장 중...' : '배정하기'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
