import { useState } from 'react';
import { useRecordConsent } from '../../hooks/use-consent';
import './consent.css';

interface LegalConsentModalProps {
  type: string;
  version: string;
  onConsent: () => void;
  onCancel: () => void;
}

export function LegalConsentModal({ type, version, onConsent, onCancel }: LegalConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const recordConsent = useRecordConsent();

  const handleConsent = async () => {
    try {
      await recordConsent.mutateAsync({ type, version });
      onConsent();
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="consent-overlay" onClick={onCancel}>
      <div className="consent-modal consent-animate-in" onClick={(e) => e.stopPropagation()}>
        <h2 className="consent-title">이용 동의</h2>

        <div className="consent-body">
          <p className="consent-text">
            본 도구는 라이선스가 적용된 평가 도구입니다. 아래 내용을 확인하고 동의해주세요.
          </p>
          <div className="consent-terms">
            <p>1. 본 평가 도구의 저작권은 원저작자에게 있으며, 정식 라이선스를 통해 제공됩니다.</p>
            <p>2. 평가 결과는 교육 및 발달 지원 목적으로만 사용되어야 합니다.</p>
            <p>3. 평가 데이터는 아이의 개인정보 보호를 위해 안전하게 암호화되어 저장됩니다.</p>
            <p>4. 수집된 데이터는 제3자에게 제공되지 않으며, 보호자의 동의 없이 연구 목적으로 사용되지 않습니다.</p>
            <p>5. 본 동의는 언제든지 설정에서 철회할 수 있으며, 철회 시 관련 데이터는 삭제됩니다.</p>
          </div>
        </div>

        <label className="consent-checkbox-label">
          <input
            type="checkbox"
            className="consent-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="consent-checkbox-custom" />
          <span className="consent-checkbox-text">위 내용을 읽고 동의합니다</span>
        </label>

        <div className="consent-actions">
          <button className="consent-btn-cancel" onClick={onCancel}>
            취소
          </button>
          <button
            className="consent-btn-agree"
            disabled={!agreed || recordConsent.isPending}
            onClick={handleConsent}
          >
            {recordConsent.isPending ? '처리 중...' : '동의하고 계속'}
          </button>
        </div>
      </div>
    </div>
  );
}
