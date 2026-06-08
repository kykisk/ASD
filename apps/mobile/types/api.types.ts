export interface Child {
  id: string;
  familyId: string;
  name: string;
  birthDate: string;
  gender: string | null;
  diagnosisName: string | null;
  diagnosisDate: string | null;
  notes: string | null;
  developmentalLevel: {
    language?: string;
    cognitive?: string;
    motor?: string;
    selfCare?: string;
    social?: string;
    overall?: string;
  } | null;
  centerInfo: Array<{
    name: string;
    type: string;
    frequency: string;
    currentGoal?: string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodaySchedule {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  isCompleted: boolean;
}

export interface DashboardDomainScore {
  domain: string;
  score: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface DashboardAlert {
  type: 'ASSESSMENT_DUE' | 'MILESTONE' | 'NO_SCHEDULE';
  message: string;
  severity: 'info' | 'warning';
}

export interface DashboardData {
  child: {
    id: string;
    name: string;
    ageMonths: number;
    therapyDays: number;
  };
  today: {
    schedules: TodaySchedule[];
    completedCount: number;
    totalCount: number;
  };
  recentAssessment: {
    date: string;
    overallScore: number;
    domainScores: DashboardDomainScore[];
  } | null;
  weeklyProgress: {
    completionRate: number;
    assessmentCount: number;
    streak: number;
  };
  alerts: DashboardAlert[];
}

export interface CurriculumActivity {
  title: string;
  domain: string;
  durationMin: number;
  description: string;
  materials?: string[];
  steps: string[];
  successCriteria: string;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface Curriculum {
  id: string;
  childId: string;
  date: string;
  status: 'PENDING' | 'GENERATED' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  weeklyGoal: string | null;
  activities: CurriculumActivity[];
  notes: string | null;
  generatedAt: string | null;
}

export interface LogActivityInput {
  result: 'SUCCESS' | 'PARTIAL' | 'SKIPPED' | 'FAILED';
  durationMin?: number;
  notes?: string;
  activityTitle: string;
  curriculumId: string;
  activityIndex: number;
}

export interface QuestionnaireItem {
  id: string;
  text: string;
  domain: string;
  orderIndex: number;
}

export interface Questionnaire {
  id: string;
  name: string;
  type: string;
  domains: string[];
  items: QuestionnaireItem[];
}

export interface AssessmentScore {
  id: string;
  assessmentId: string;
  itemId: string;
  domain: string;
  score: number;
}

export interface Assessment {
  id: string;
  childId: string;
  questionnaireId: string;
  frequency: string;
  notes: string | null;
  totalScore: number | null;
  createdAt: string;
  scores: AssessmentScore[];
  questionnaire?: {
    type: string;
    licensedTool: string | null;
    name: string;
  };
}

export interface CreateAssessmentInput {
  questionnaireId: string;
  frequency?: 'DAILY' | 'WEEKLY';
  notes?: string;
  scores: {
    itemId: string;
    domain: string;
    score: number;
    notes?: string;
  }[];
}

export interface AggregatedDomain {
  domain: string;
  label: string;
  currentScore: number;
  percentage: number;
  trend: {
    direction: string;
    label: string;
  };
}

export interface AggregatedAssessment {
  overallScore: number;
  domains: AggregatedDomain[];
  assessmentCount: number;
}

export interface ScheduleOccurrence {
  id: string;
  originalScheduleId: string;
  childId: string;
  title: string;
  description: string | null;
  category: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  recurrenceType: string;
  location: string | null;
  color: string | null;
  isRecurrenceInstance: boolean;
}

export interface CreateScheduleInput {
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  recurrenceType?: string;
  recurrenceRule?: string;
  location?: string;
  notes?: string;
  color?: string;
}

export interface UpdateScheduleInput {
  title?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  recurrenceType?: string;
  recurrenceRule?: string;
  location?: string;
  notes?: string;
  color?: string;
  editMode?: 'THIS_ONLY' | 'ALL';
}

export interface TimeSeriesPoint {
  date: string;
  score: number;
  assessmentId: string;
}

export interface DomainTimeSeries {
  domain: string;
  label: string;
  color: string;
  data: TimeSeriesPoint[];
}

export interface GrowthData {
  childId: string;
  dateRange: {
    from: string;
    to: string;
  };
  domains: DomainTimeSeries[];
  overall: TimeSeriesPoint[];
}
