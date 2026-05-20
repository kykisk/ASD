interface RecurringEditDialogProps {
  isOpen: boolean;
  onSelect: (mode: 'THIS_ONLY' | 'ALL') => void;
  onCancel: () => void;
}

export function RecurringEditDialog({ isOpen, onSelect, onCancel }: RecurringEditDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 24px',
        maxWidth: 360, width: '100%',
        boxShadow: '0 8px 32px rgba(91,138,114,0.16)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#2C3E50', marginBottom: 8 }}>
          반복 일정 수정
        </h3>
        <p style={{ fontSize: 14, color: '#6B7B8D', marginBottom: 24 }}>
          어떤 일정을 수정할까요?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => onSelect('THIS_ONLY')}
            style={{
              padding: '14px 16px', borderRadius: 12,
              border: '1.5px solid #E8E4DF', background: '#FDFBF7',
              textAlign: 'left', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#2C3E50',
            }}
          >
            이 날 일정만 수정
            <div style={{ fontSize: 12, color: '#94A3B4', fontWeight: 400, marginTop: 2 }}>
              선택한 날짜의 일정만 변경됩니다
            </div>
          </button>

          <button
            onClick={() => onSelect('ALL')}
            style={{
              padding: '14px 16px', borderRadius: 12,
              border: '1.5px solid #5B8A72', background: '#E8F5EE',
              textAlign: 'left', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#3D6B54',
            }}
          >
            전체 반복 일정 수정
            <div style={{ fontSize: 12, color: '#5B8A72', fontWeight: 400, marginTop: 2 }}>
              모든 반복 일정이 변경됩니다
            </div>
          </button>

          <button
            onClick={onCancel}
            style={{
              padding: '12px 16px', borderRadius: 12,
              border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 14, color: '#94A3B4',
              marginTop: 4,
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
