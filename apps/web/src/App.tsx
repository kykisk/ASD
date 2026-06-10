import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { FamilyPage } from './pages/FamilyPage';
import { ChildrenPage } from './pages/ChildrenPage';
import { SchedulePage } from './pages/SchedulePage';
import { QuestionnairePage } from './pages/QuestionnairePage';
import { AssessmentPage } from './pages/AssessmentPage';
import { AssessmentHistoryPage } from './pages/AssessmentHistoryPage';
import { GrowthPage } from './pages/GrowthPage';
import { InsightsPage } from './pages/InsightsPage';
import { CurriculumPage } from './pages/CurriculumPage';
import { CurriculumHistoryPage } from './pages/CurriculumHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { WellbeingPage } from './pages/WellbeingPage';
import { EmergencyGuidePage } from './pages/EmergencyGuidePage';
import { SensoryProfilePage } from './pages/SensoryProfilePage';
import { ResearchPage } from './pages/ResearchPage';
import { FamilyCollaborationPage } from './pages/FamilyCollaborationPage';
import { LicensedAssessmentPage } from './pages/LicensedAssessmentPage';
import { ClinicalPage } from './pages/ClinicalPage';
import { SessionFeedbackPage } from './pages/SessionFeedbackPage';
import { MedicationPage } from './pages/MedicationPage';
import { DesignPreviewIndex } from './pages/design-preview/index';
import { DesignPreviewLogin } from './pages/design-preview/DesignPreviewLogin';
import { DesignPreviewRegister } from './pages/design-preview/DesignPreviewRegister';
import { DesignPreviewDashboard } from './pages/design-preview/DesignPreviewDashboard';
import { DesignPreviewAssessment } from './pages/design-preview/DesignPreviewAssessment';
import { DesignPreviewCalendar } from './pages/design-preview/DesignPreviewCalendar';
import { DesignPreviewChildProfile } from './pages/design-preview/DesignPreviewChildProfile';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="children" element={<ChildrenPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="questionnaires" element={<QuestionnairePage />} />
        <Route path="assessment" element={<AssessmentPage />} />
        <Route path="assessment/history" element={<AssessmentHistoryPage />} />
        <Route path="growth" element={<GrowthPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="curriculum/history" element={<CurriculumHistoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="wellbeing" element={<WellbeingPage />} />
        <Route path="emergency" element={<EmergencyGuidePage />} />
        <Route path="sensory-profile" element={<SensoryProfilePage />} />
        <Route path="research" element={<ResearchPage />} />
        <Route path="collaboration" element={<FamilyCollaborationPage />} />
        <Route path="assessment/licensed/:tool" element={<LicensedAssessmentPage />} />
        <Route path="clinical" element={<ClinicalPage />} />
        <Route path="session-feedback" element={<SessionFeedbackPage />} />
        <Route path="medication" element={<MedicationPage />} />
      </Route>
      <Route path="/design-preview" element={<DesignPreviewIndex />} />
      <Route path="/design-preview/login" element={<DesignPreviewLogin />} />
      <Route path="/design-preview/register" element={<DesignPreviewRegister />} />
      <Route path="/design-preview/dashboard" element={<DesignPreviewDashboard />} />
      <Route path="/design-preview/assessment" element={<DesignPreviewAssessment />} />
      <Route path="/design-preview/calendar" element={<DesignPreviewCalendar />} />
      <Route path="/design-preview/child-profile" element={<DesignPreviewChildProfile />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
