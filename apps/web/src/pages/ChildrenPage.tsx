import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useChildren,
  useCreateChild,
  useUpdateChild,
  useDeleteChild,
  Child,
  DevelopmentalLevel,
  CenterInfoItem,
} from '../hooks/use-children';
import { useMyFamily, FamilyMember } from '../hooks/use-families';
import { useAuthStore } from '../stores/auth.store';
import { Skeleton, ErrorState, EmptyState, PageHeader } from '../components/ui';

const childSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(20, '이름은 최대 20자까지 가능합니다')
    .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글 또는 영문만 입력 가능합니다'),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식을 입력해주세요 (YYYY-MM-DD)'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).or(z.literal('')).optional(),
  diagnosisName: z.string().max(100).optional(),
  diagnosisDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '유효한 날짜 형식을 입력해주세요')
    .or(z.literal(''))
    .optional(),
  notes: z.string().max(500).optional(),
  developmentalLevel: z.object({
    language: z.string().max(500).optional(),
    cognitive: z.string().max(500).optional(),
    motor: z.string().max(500).optional(),
    selfCare: z.string().max(500).optional(),
    social: z.string().max(500).optional(),
    overall: z.string().max(500).optional(),
  }).optional(),
  centerInfo: z.array(z.object({
    name: z.string().min(1, '센터명을 입력해주세요').max(100),
    type: z.string().min(1, '유형을 선택해주세요').max(50),
    frequency: z.string().max(50),
    currentGoal: z.string().max(300).optional(),
  })).max(10).optional(),
});

type ChildFormData = z.infer<typeof childSchema>;

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years < 1) {
    return `${Math.max(0, months + years * 12)}개월`;
  }
  return `만 ${years}세`;
}

function getGenderLabel(gender?: string | null): string {
  switch (gender) {
    case 'MALE':
      return '남';
    case 'FEMALE':
      return '여';
    case 'OTHER':
      return '기타';
    default:
      return '';
  }
}

export function ChildrenPage() {
  const { user } = useAuthStore();
  const { data: family } = useMyFamily();
  const { data: children, isLoading, isError, refetch } = useChildren(family?.id);
  const createChild = useCreateChild();
  const updateChild = useUpdateChild();
  const deleteChild = useDeleteChild();

  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = family?.members?.some(
    (m: FamilyMember) => m.userId === user?.id && m.role === 'FAMILY_ADMIN',
  );

  const form = useForm<ChildFormData>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: '',
      birthDate: '',
      gender: '',
      diagnosisName: '',
      diagnosisDate: '',
      notes: '',
      developmentalLevel: {
        language: '',
        cognitive: '',
        motor: '',
        selfCare: '',
        social: '',
        overall: '',
      },
      centerInfo: [],
    },
  });

  const { fields: centerFields, append: appendCenter, remove: removeCenter } = useFieldArray({
    control: form.control,
    name: 'centerInfo',
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreateForm = () => {
    setEditingChild(null);
    form.reset({
      name: '',
      birthDate: '',
      gender: '',
      diagnosisName: '',
      diagnosisDate: '',
      notes: '',
      developmentalLevel: {
        language: '',
        cognitive: '',
        motor: '',
        selfCare: '',
        social: '',
        overall: '',
      },
      centerInfo: [],
    });
    setShowForm(true);
  };

  const openEditForm = (child: Child) => {
    setEditingChild(child);
    form.reset({
      name: child.name,
      birthDate: child.birthDate,
      gender: child.gender || '',
      diagnosisName: child.diagnosisName || '',
      diagnosisDate: child.diagnosisDate || '',
      notes: child.notes || '',
      developmentalLevel: {
        language: child.developmentalLevel?.language || '',
        cognitive: child.developmentalLevel?.cognitive || '',
        motor: child.developmentalLevel?.motor || '',
        selfCare: child.developmentalLevel?.selfCare || '',
        social: child.developmentalLevel?.social || '',
        overall: child.developmentalLevel?.overall || '',
      },
      centerInfo: child.centerInfo?.map((c) => ({
        name: c.name,
        type: c.type,
        frequency: c.frequency,
        currentGoal: c.currentGoal || '',
      })) || [],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingChild(null);
    form.reset();
  };

  const onSubmit = (data: ChildFormData) => {
    const dl = data.developmentalLevel;
    const hasDevelopmentalLevel = dl && Object.values(dl).some((v) => v && v.trim());
    const cleanedDl = hasDevelopmentalLevel
      ? Object.fromEntries(Object.entries(dl).filter(([, v]) => v && v.trim()))
      : undefined;

    const payload = {
      name: data.name,
      birthDate: data.birthDate,
      ...(data.gender ? { gender: data.gender as 'MALE' | 'FEMALE' | 'OTHER' } : {}),
      ...(data.diagnosisName ? { diagnosisName: data.diagnosisName } : {}),
      ...(data.diagnosisDate && data.diagnosisDate !== '' ? { diagnosisDate: data.diagnosisDate } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(cleanedDl ? { developmentalLevel: cleanedDl } : {}),
      ...(data.centerInfo && data.centerInfo.length > 0 ? { centerInfo: data.centerInfo } : {}),
    };

    if (editingChild) {
      updateChild.mutate(
        { childId: editingChild.id, input: payload },
        {
          onSuccess: () => {
            showToast('success', '아이 정보가 수정되었습니다.');
            closeForm();
          },
          onError: () => showToast('error', '수정에 실패했습니다.'),
        },
      );
    } else {
      if (!family?.id) return;
      createChild.mutate(
        { familyId: family.id, input: payload },
        {
          onSuccess: () => {
            showToast('success', '아이가 등록되었습니다.');
            closeForm();
          },
          onError: () => showToast('error', '등록에 실패했습니다.'),
        },
      );
    }
  };

  const handleDelete = (childId: string) => {
    deleteChild.mutate(childId, {
      onSuccess: () => {
        showToast('success', '아이 정보가 삭제되었습니다.');
        setConfirmDelete(null);
      },
      onError: () => showToast('error', '삭제에 실패했습니다.'),
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton height="h-8" className="w-40" rounded="rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton height="h-12" className="w-12" rounded="rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton height="h-4" className="w-20" />
                  <Skeleton height="h-3" className="w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          title="아이 목록을 불러올 수 없습니다"
          message="네트워크 상태를 확인 후 다시 시도해주세요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        title="아이 관리"
        subtitle="아이의 프로필을 등록하고 관리하세요."
          action={
          family?.id ? (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 shadow-sage-sm transition-colors min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              아이 추가
            </button>
          ) : undefined
        }
      />

      {!family?.id && (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          }
          title="먼저 가족을 생성해주세요"
          description="아이를 등록하려면 먼저 가족 관리에서 가족을 생성해야 합니다."
        />
      )}

      {family?.id && children && children.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          }
          title="아직 등록된 아이가 없습니다"
          description="아이를 추가해주세요."
          action={{ label: '첫 아이 등록하기', onClick: openCreateForm }}
        />
      )}

      {children && children.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child: Child) => (
            <div
              key={child.id}
              className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm hover:shadow-sage hover:border-primary-200 transition-all duration-200 cursor-pointer group"
              onClick={() => openEditForm(child)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center text-lg font-bold group-hover:from-primary-200 group-hover:to-primary-300 transition-colors">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-800">
                        {child.name}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {calculateAge(child.birthDate)}
                        {child.gender && (
                          <span className="ml-1.5 text-neutral-400">
                            · {getGenderLabel(child.gender)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmDelete === child.id) {
                          handleDelete(child.id);
                        } else {
                          setConfirmDelete(child.id);
                          setTimeout(() => setConfirmDelete(null), 3000);
                        }
                      }}
                      className={`p-1.5 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        confirmDelete === child.id
                          ? 'bg-red-100 text-red-600'
                          : 'text-neutral-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                      }`}
                      title={confirmDelete === child.id ? '다시 클릭하여 삭제' : '삭제'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                {child.diagnosisName && (
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <p className="text-xs text-neutral-400">진단명</p>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      {child.diagnosisName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-sage-lg border border-neutral-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-800">
                {editingChild ? '아이 정보 수정' : '아이 추가'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  placeholder="아이 이름"
                  className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                    form.formState.errors.name
                      ? 'border-red-300'
                      : 'border-neutral-200'
                  }`}
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  생년월일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 rounded-lg border bg-neutral-50 text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
                    form.formState.errors.birthDate
                      ? 'border-red-300'
                      : 'border-neutral-200'
                  }`}
                  {...form.register('birthDate')}
                />
                {form.formState.errors.birthDate && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {form.formState.errors.birthDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  성별 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  {...form.register('gender')}
                >
                  <option value="">선택 안함</option>
                  <option value="MALE">남</option>
                  <option value="FEMALE">여</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  진단명 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <input
                  placeholder="예: 자폐 스펙트럼 장애"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  {...form.register('diagnosisName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  진단일 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  {...form.register('diagnosisDate')}
                />
                {form.formState.errors.diagnosisDate && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {form.formState.errors.diagnosisDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  메모 <span className="text-neutral-400 text-xs font-normal">(선택)</span>
                </label>
                <textarea
                  placeholder="특이사항이나 메모를 입력하세요"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                  {...form.register('notes')}
                />
              </div>

              {/* 발달 수준 섹션 */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 space-y-3">
                <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                  <span className="text-base">📊</span> 발달 수준
                  <span className="text-neutral-400 text-xs font-normal ml-1">(선택)</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">언어 발달</label>
                  <input
                    placeholder="예: 2어 조합 수준, 요구 표현 가능"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...form.register('developmentalLevel.language')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">인지 발달</label>
                  <input
                    placeholder="예: 색상/크기 구분 가능, 수 1-5 인식"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...form.register('developmentalLevel.cognitive')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">대소근육</label>
                  <input
                    placeholder="예: 계단 한 발씩, 가위질 어려움"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...form.register('developmentalLevel.motor')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">자조 능력 (배변/식사/옷)</label>
                  <input
                    placeholder="예: 배변 훈련 중, 식사 도움 필요"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...form.register('developmentalLevel.selfCare')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">사회성</label>
                  <input
                    placeholder="예: 눈맞춤 짧음, 이름 부르면 30% 반응"
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...form.register('developmentalLevel.social')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">종합 메모</label>
                  <textarea
                    placeholder="전반적인 발달 수준에 대한 메모"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                    {...form.register('developmentalLevel.overall')}
                  />
                </div>
              </div>

              {/* 센터/치료 정보 섹션 */}
              <div className="bg-white rounded-2xl border border-[#E8E4DF] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                    <span className="text-base">🏥</span> 센터/치료 정보
                    <span className="text-neutral-400 text-xs font-normal ml-1">(선택)</span>
                  </h3>
                  {centerFields.length < 10 && (
                    <button
                      type="button"
                      onClick={() => appendCenter({ name: '', type: '', frequency: '', currentGoal: '' })}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1.5 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      + 센터 추가
                    </button>
                  )}
                </div>

                {centerFields.length === 0 && (
                  <p className="text-xs text-neutral-400 py-2">등록된 센터가 없습니다. 위 버튼으로 추가해주세요.</p>
                )}

                {centerFields.map((field, index) => (
                  <div key={field.id} className="relative bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => removeCenter(index)}
                      className="absolute top-3 right-3 p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">센터명</label>
                      <input
                        placeholder="예: 해피키즈 언어치료"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        {...form.register(`centerInfo.${index}.name`)}
                      />
                      {form.formState.errors.centerInfo?.[index]?.name && (
                        <p className="mt-1 text-xs text-red-500">{form.formState.errors.centerInfo[index]?.name?.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">유형</label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          {...form.register(`centerInfo.${index}.type`)}
                        >
                          <option value="">선택</option>
                          <option value="언어치료">언어치료</option>
                          <option value="ABA">ABA</option>
                          <option value="작업치료">작업치료</option>
                          <option value="감각통합">감각통합</option>
                          <option value="음악치료">음악치료</option>
                          <option value="미술치료">미술치료</option>
                          <option value="놀이치료">놀이치료</option>
                          <option value="기타">기타</option>
                        </select>
                        {form.formState.errors.centerInfo?.[index]?.type && (
                          <p className="mt-1 text-xs text-red-500">{form.formState.errors.centerInfo[index]?.type?.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">빈도</label>
                        <input
                          placeholder="예: 주 2회 (월,수)"
                          className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                          {...form.register(`centerInfo.${index}.frequency`)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">현재 목표 <span className="text-neutral-400 font-normal">(선택)</span></label>
                      <textarea
                        placeholder="예: 요구 표현 문장화"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                        {...form.register(`centerInfo.${index}.currentGoal`)}
                      />
                    </div>
                  </div>
                ))}

                {centerFields.length > 0 && centerFields.length < 10 && (
                  <button
                    type="button"
                    onClick={() => appendCenter({ name: '', type: '', frequency: '', currentGoal: '' })}
                    className="w-full py-2 text-xs font-medium text-primary-600 hover:text-primary-700 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    + 센터 추가
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createChild.isPending || updateChild.isPending}
                  className="flex-1 py-3 px-4 rounded-lg bg-primary-500 text-white font-semibold shadow-sage-sm hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {(createChild.isPending || updateChild.isPending)
                    ? '저장 중...'
                    : editingChild
                    ? '수정 완료'
                    : '등록하기'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-3 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
