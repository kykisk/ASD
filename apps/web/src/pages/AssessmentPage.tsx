import { AssessmentForm } from '../components/assessment/AssessmentForm';
import { HistoryPanel } from '../components/assessment/HistoryPanel';
import { useChildStore } from '../stores/child.store';
import '../components/assessment/assessment.css';
import './assessment-page.css';

export function AssessmentPage() {
  const { selectedChildId } = useChildStore();

  return (
    <div className="assessment-page-layout">
      <div className="assessment-page-grid">
        <div className="assessment-page-form">
          <AssessmentForm />
        </div>
        <div className="assessment-page-history">
          <HistoryPanel childId={selectedChildId} />
        </div>
      </div>
    </div>
  );
}
