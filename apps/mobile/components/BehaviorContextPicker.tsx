import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ANTECEDENT_OPTIONS, RESPONSE_OPTIONS, SETTLED_OPTIONS } from '../constants/find-way.js';
import type { BehaviorContext } from '../hooks/use-daily-record.js';
import { colors } from '../constants/theme.js';

function Chips({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: string; label: string }>;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onChange(on ? null : o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const asOptions = (labels: string[]) => labels.map((l) => ({ key: l, label: l }));

/**
 * 힘든 행동 '언제 · 왜' (선택): 바로 전 상황 · 어떻게 했는지 · 진정까지.
 * 쌓이면 맞는 방법 찾기에서 패턴으로 보여줌
 */
export function BehaviorContextPicker({
  value,
  onChange,
}: {
  value: BehaviorContext;
  onChange: (next: BehaviorContext) => void;
}) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>언제 · 왜 (선택, 쌓이면 패턴이 보여요)</Text>
      <Text style={styles.label}>바로 전에 무슨 일이 있었나요?</Text>
      <Chips
        options={asOptions(ANTECEDENT_OPTIONS)}
        value={value.antecedent}
        onChange={(antecedent) => onChange({ ...value, antecedent })}
      />
      <Text style={styles.label}>어떻게 하셨어요?</Text>
      <Chips
        options={asOptions(RESPONSE_OPTIONS)}
        value={value.parentResponse}
        onChange={(parentResponse) => onChange({ ...value, parentResponse })}
      />
      <Text style={styles.label}>진정까지</Text>
      <Chips
        options={SETTLED_OPTIONS}
        value={value.settled}
        onChange={(settled) =>
          onChange({ ...value, settled: settled as BehaviorContext['settled'] })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#FDFBF7', borderRadius: 12, padding: 10, gap: 6 },
  title: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  label: { fontSize: 13, color: colors.text, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  chipOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 12, color: colors.text },
  chipTextOn: { fontWeight: '700', color: colors.primaryDark },
});
