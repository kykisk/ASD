import { useState } from 'react';
import { useAssessments } from '../../hooks/use-assessments';
import type { Assessment } from '../../hooks/use-assessments';
import './history-panel.css';

const domainNames: Record<string, string> = {
  communication: '의사소통',
  social: '사회성',
  motor: '운동',
  cognitive: '인지',
  emotional: '정서',
};

const domainColors: Record<string, string> = {
  communication: '#7B9FD4',
  social: '#E8A87C',
  motor: '#9B8EC4',
  cognitive: '#7EC8C8',
  emotional: '#F2B880',
};

function getScoreEmoji(score: number): { emoji: string; color: string } {
  if (score >= 5) return { emoji: '😊', color: '#5B8A72' };
  if (score >= 4) return { emoji: '🙂', color: '#5BAA5B' };
  if (score >= 3) return { emoji: '😐', color: '#D4A800' };
  if (score >= 2) return { emoji: '😟', color: '#F0A86E' };
  return { emoji: '😢', color: '#E88B8B' };
}

function formatKoreanDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${period} ${displayHour}:${minutes.toString().padStart(2, '0')}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

interface AssessmentCardProps {
  assessment: Assessment;
}

function AssessmentCard({ assessment }: AssessmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scoreInfo = getScoreEmoji(assessment.overallScore);

  const domainScores: Record<string, number[]> = {};
  assessment.scores.forEach((s) => {
    if (!domainScores[s.domain]) domainScores[s.domain] = [];
    domainScores[s.domain].push(s.score);
  });

  const domainAverages = Object.entries(domainScores).map(([domain, scores]) => ({
    domain,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  return (
    <div className="hp-assessment-card">
      <div className="hp-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="hp-card-title-row">
          <span className="hp-card-title">{assessment.questionnaireName}</span>
          <span className="hp-card-time">{formatTime(assessment.createdAt)} 완료</span>
        </div>
        <div className="hp-card-score-row">
          <span className="hp-card-overall" style={{ color: scoreInfo.color }}>
            {scoreInfo.emoji} {assessment.overallScore.toFixed(1)}점
          </span>
          <button
            className="hp-expand-btn"
            aria-label={expanded ? '접기' : '펼치기'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
            >
              <path d="M4 6l4 4 4-4" stroke="#94A3B4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hp-domain-pills">
        {domainAverages.map(({ domain, avg }) => {
          const name = domainNames[domain] || domain;
          const color = domainColors[domain] || '#94A3B8';
          const emoji = getScoreEmoji(Math.round(avg));
          return (
            <span
              key={domain}
              className="hp-domain-pill"
              style={{ borderColor: `${color}40`, background: `${color}10` }}
            >
              <span className="hp-pill-name" style={{ color }}>{name}</span>
              <span className="hp-pill-emoji">{emoji.emoji}</span>
              <span className="hp-pill-score" style={{ color }}>{Math.round(avg)}</span>
            </span>
          );
        })}
      </div>

      {expanded && (
        <div className="hp-expanded-detail">
          {domainAverages.map(({ domain, avg }) => {
            const name = domainNames[domain] || domain;
            const color = domainColors[domain] || '#94A3B8';
            const percentage = (avg / 5) * 100;
            return (
              <div key={domain} className="hp-detail-row">
                <span className="hp-detail-name">{name}</span>
                <div className="hp-detail-bar-track">
                  <div
                    className="hp-detail-bar-fill"
                    style={{ width: `${percentage}%`, background: color }}
                  />
                </div>
                <span className="hp-detail-score" style={{ color }}>{avg.toFixed(1)}/5</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface HistoryPanelProps {
  childId: string | null;
}

export function HistoryPanel({ childId }: HistoryPanelProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data: assessments, isLoading } = useAssessments(childId);

  const dayAssessments = (assessments ?? []).filter((a: Assessment) => {
    const assessDate = new Date(a.createdAt);
    return isSameDay(assessDate, selectedDate);
  });

  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    if (isToday(selectedDate)) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const todaySelected = isToday(selectedDate);

  return (
    <div className="hp-container">
      <div className="hp-header">
        <span className="hp-header-icon">📋</span>
        <span className="hp-header-title">평가 기록</span>
      </div>

      <div className="hp-date-nav">
        <button className="hp-date-arrow" onClick={goToPrevDay} aria-label="이전 날">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={`hp-date-display ${todaySelected ? 'hp-date-today' : ''}`}>
          {formatKoreanDate(selectedDate)}
          {todaySelected && <span className="hp-today-badge">오늘</span>}
        </span>
        <button
          className={`hp-date-arrow ${todaySelected ? 'hp-date-arrow-disabled' : ''}`}
          onClick={goToNextDay}
          disabled={todaySelected}
          aria-label="다음 날"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="hp-content">
        {isLoading && (
          <div className="hp-loading">
            <div className="hp-loading-spinner" />
          </div>
        )}

        {!isLoading && dayAssessments.length === 0 && (
          <div className="hp-empty">
            <span className="hp-empty-icon">🗓️</span>
            <p className="hp-empty-text">이 날 평가 기록이 없어요</p>
          </div>
        )}

        {!isLoading && dayAssessments.length > 0 && (
          <div className="hp-assessment-list">
            {dayAssessments.map((assessment: Assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
