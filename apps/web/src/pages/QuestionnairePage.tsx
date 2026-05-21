import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useQuestionnaires, type Questionnaire, type Domain } from '../hooks/use-questionnaires';
import { useMyFamily } from '../hooks/use-families';
import { QuestionnaireFormModal } from '../components/questionnaire/QuestionnaireFormModal';
import { ImportModal } from '../components/questionnaire/ImportModal';
import { AiGenerateModal } from '../components/questionnaire/AiGenerateModal';
import { Skeleton, ErrorState, EmptyState, PageHeader } from '../components/ui';

const DOMAIN_LABELS: Record<Domain, { label: string; color: string }> = {
  COMMUNICATION: { label: '의사소통', color: '#7B9FD4' },
  SOCIAL: { label: '사회성', color: '#E8A87C' },
  MOTOR: { label: '운동', color: '#9B8EC4' },
  COGNITIVE: { label: '인지', color: '#7EC8C8' },
  EMOTIONAL: { label: '정서', color: '#F2B880' },
  DAILY_LIVING: { label: '일상생활', color: '#94B8A0' },
  OTHER: { label: '기타', color: '#C4B5A0' },
};

const LICENSED_TOOLS = [
  { name: 'CARS-2', description: '아동기 자폐증 평정 척도 2판' },
  { name: 'ADOS-2', description: '자폐증 진단 관찰 스케줄 2판' },
  { name: 'ADI-R', description: '자폐증 진단 면담 개정판' },
  { name: 'K-WISC-V', description: '한국 웩슬러 아동 지능 검사 5판' },
  { name: 'Vineland-3', description: '바인랜드 적응행동 척도 3판' },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function QuestionnairePage() {
  const { user } = useAuthStore();
  const { data: family } = useMyFamily();
  const { data: questionnaires, isLoading, isError, refetch } = useQuestionnaires(family?.id);

  const [activeTab, setActiveTab] = useState<'custom' | 'licensed'>('custom');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAiGenerateModal, setShowAiGenerateModal] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);

  const openEdit = (q: Questionnaire) => {
    setEditingQuestionnaire(q);
    setShowFormModal(true);
  };

  const openCreate = () => {
    setEditingQuestionnaire(null);
    setShowFormModal(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton height="h-8" className="w-48" rounded="rounded-lg" />
        <Skeleton height="h-12" className="w-64" rounded="rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white rounded-xl border border-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          title="질문지를 불러올 수 없습니다"
          message="잠시 후 다시 시도해주세요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="질문지"
        subtitle="아이의 발달을 관찰하기 위한 질문지를 관리하세요."
      />

      <div className="flex gap-1 p-1 rounded-[14px] bg-neutral-50 border border-neutral-200 w-fit">
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-[11px] transition-all min-h-[44px] ${
            activeTab === 'custom'
              ? 'bg-white text-primary-600 shadow-sage-sm'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          비라이선스
        </button>
        <button
          onClick={() => setActiveTab('licensed')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-[11px] transition-all min-h-[44px] ${
            activeTab === 'licensed'
              ? 'bg-white text-primary-600 shadow-sage-sm'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          라이선스 도구
        </button>
      </div>

      {activeTab === 'custom' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={openCreate}
              className="h-[48px] flex items-center gap-2 px-6 rounded-xl bg-primary-500 text-white text-[15px] font-semibold shadow-sage hover:bg-primary-600 hover:shadow-sage-lg hover:-translate-y-[1px] active:translate-y-0 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              새 질문지 만들기
            </button>
            <button
              onClick={() => setShowAiGenerateModal(true)}
              className="h-[48px] flex items-center gap-2 px-6 rounded-xl border-[1.5px] border-primary-500 text-primary-600 text-[15px] font-semibold hover:bg-primary-50 transition-colors"
            >
              <span className="text-base">✨</span>
              AI로 생성하기
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="h-[48px] flex items-center gap-2 px-6 rounded-xl border-[1.5px] border-primary-500 text-primary-600 text-[15px] font-semibold hover:bg-primary-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              파일로 가져오기
            </button>
          </div>

          {questionnaires && questionnaires.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {questionnaires.map((q) => (
                <div
                  key={q.id}
                  onClick={() => openEdit(q)}
                  className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sage-sm hover:shadow-sage hover:border-primary-200 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors">
                      {q.name}
                    </h3>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {formatDate(q.createdAt)}
                    </span>
                  </div>

                  {q.description && (
                    <p className="text-sm text-neutral-500 mb-3 line-clamp-2">
                      {q.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {q.domains.map((domain) => {
                      const info = DOMAIN_LABELS[domain];
                      return (
                        <span
                          key={domain}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{
                            backgroundColor: `${info.color}18`,
                            color: info.color,
                          }}
                        >
                          {info.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <span>{q.items?.length || 0}개 문항</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
              title="아직 질문지가 없어요"
              description="새로 만들거나 파일로 가져오세요."
              action={{ label: '새 질문지 만들기', onClick: openCreate }}
            />
          )}
        </div>
      )}

      {activeTab === 'licensed' && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sage-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="shrink-0 w-10 h-10 rounded-[10px] bg-[#9B8EC4]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#9B8EC4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-800">
                  라이선스 도구는 Phase 5에서 지원될 예정입니다
                </h3>
                <p className="text-sm text-neutral-500 mt-1">
                  표준화된 평가 도구는 라이선스 확인 및 법적 동의 절차를 거친 후 사용할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {LICENSED_TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50"
                >
                  <div>
                    <span className="text-sm font-semibold text-neutral-800">{tool.name}</span>
                    <p className="text-xs text-neutral-400 mt-0.5">{tool.description}</p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg bg-neutral-200/60 text-xs font-medium text-neutral-500">
                    준비중
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60">
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                법적 동의 필요: 라이선스 도구 사용 시 저작권자 동의 및 전문가 자격 확인이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <QuestionnaireFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingQuestionnaire(null);
        }}
        editingQuestionnaire={editingQuestionnaire}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <AiGenerateModal
        isOpen={showAiGenerateModal}
        onClose={() => setShowAiGenerateModal(false)}
      />
    </div>
  );
}
