import { ANTECEDENT_OPTIONS, RESPONSE_OPTIONS, SETTLED_OPTIONS } from '../../utils/find-way';
import type { BehaviorContext } from '../../hooks/use-daily-record';

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-neutral-700">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : o.key)}
              className={`h-7 px-2.5 rounded-full text-xs ${
                on
                  ? 'border-2 border-primary-500 bg-primary-50 font-bold text-primary-800'
                  : 'border border-neutral-200 bg-white text-neutral-800'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const asOptions = (labels: string[]) => labels.map((l) => ({ key: l, label: l }));

/** 힘든 행동 '언제 · 왜' (선택). 쌓이면 맞는 방법 찾기에서 패턴으로 보여줌 */
export function BehaviorContextPicker({
  value,
  onChange,
}: {
  value: BehaviorContext;
  onChange: (next: BehaviorContext) => void;
}) {
  return (
    <div className="bg-[#FDFBF7] rounded-xl p-3 flex flex-col gap-2">
      <span className="text-xs font-bold text-primary-700">
        언제 · 왜 (선택, 쌓이면 패턴이 보여요)
      </span>
      <Chips
        label="바로 전에 무슨 일이 있었나요?"
        options={asOptions(ANTECEDENT_OPTIONS)}
        value={value.antecedent}
        onChange={(antecedent) => onChange({ ...value, antecedent })}
      />
      <Chips
        label="어떻게 하셨어요?"
        options={asOptions(RESPONSE_OPTIONS)}
        value={value.parentResponse}
        onChange={(parentResponse) => onChange({ ...value, parentResponse })}
      />
      <Chips
        label="진정까지"
        options={SETTLED_OPTIONS}
        value={value.settled}
        onChange={(settled) =>
          onChange({ ...value, settled: settled as BehaviorContext['settled'] })
        }
      />
    </div>
  );
}
