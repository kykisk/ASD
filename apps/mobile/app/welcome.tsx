import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.store.js';
import { useChildStore } from '../stores/child.store.js';
import {
  CENTER_OPTIONS,
  CONCERN_OPTIONS,
  DIAGNOSIS_OPTIONS,
  buildOnboardingProfile,
} from '../constants/onboarding-profile.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';
import type { Curriculum } from '../types/api.types.js';

const toggle = (list: string[], v: string) =>
  list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** 숫자만 입력해도 YYYY-MM-DD 로 맞춰줌 */
function formatBirthDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** 첫 사용 안내: 아이 등록 → 센터·고민 → 첫 활동 만들기 → 오늘 화면(따라하기 투어) */
export default function WelcomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { familyId, fetchChildren, selectChild } = useChildStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [centers, setCenters] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [likes, setLikes] = useState('');
  const [working, setWorking] = useState(false);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);

  const birthValid =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    !isNaN(new Date(birthDate).getTime()) &&
    new Date(birthDate) <= new Date();
  const step1Valid = name.trim().length > 0 && birthValid;

  const finish = async () => {
    setWorking(true);
    setError(null);
    try {
      let fid = familyId;
      if (!fid) {
        const { data: mine } = await api.get('/families/my');
        fid = (mine.data as Array<{ id: string }>)[0]?.id ?? null;
      }
      if (!fid) {
        const { data } = await api.post('/families', { name: `${user?.name ?? '우리'} 가족` });
        fid = data.data.id as string;
      }
      const { data: created } = await api.post(`/families/${fid}/children`, {
        name: name.trim(),
        birthDate,
        ...(diagnosis && diagnosis !== '평가 중이에요' ? { diagnosisName: diagnosis } : {}),
        ...buildOnboardingProfile({ centers, concerns, likes }),
      });
      const childId = created.data.id as string;
      await fetchChildren(fid);
      selectChild(childId);
      setStep(3);
      const { data: generated } = await api.post(`/children/${childId}/curriculum/generate`, {});
      setCurriculum(generated.data as Curriculum);
    } catch {
      setError('잠시 후 다시 시도해주세요. 오늘 화면에서 활동을 다시 만들 수 있어요.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 8 }}>
        <Text style={styles.stepText}>{step} / 3</Text>
        <View style={styles.progress}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.progressBar, n <= step && styles.progressBarOn]} />
          ))}
        </View>
      </View>

      {step === 1 && (
        <>
          <View style={{ gap: 8 }}>
            <Text style={styles.title}>반가워요.{'\n'}아이에 대해 알려주세요</Text>
            <Text style={styles.lead}>
              아이에게 맞는 집 활동을 만들기 위해 필요해요. 나중에 언제든 바꿀 수 있어요.
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>이름 또는 애칭</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={20}
              placeholder="예: 하늘이"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>생년월일</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={(t) => setBirthDate(formatBirthDate(t))}
              keyboardType="number-pad"
              placeholder="예: 2022-03-15"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              진단을 받았나요? <Text style={styles.optional}>(선택)</Text>
            </Text>
            <View style={styles.chips}>
              {DIAGNOSIS_OPTIONS.map((d) => (
                <Chip
                  key={d}
                  label={d}
                  active={diagnosis === d}
                  onPress={() => setDiagnosis(diagnosis === d ? null : d)}
                />
              ))}
            </View>
          </View>
          <Text style={styles.note}>
            이름과 생년월일은 암호화해서 저장해요. AI에게는 나이(개월 수)만 전달돼요.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, !step1Valid && styles.disabled]}
            disabled={!step1Valid}
            onPress={() => setStep(2)}
          >
            <Text style={styles.primaryText}>다음</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <View style={{ gap: 8 }}>
            <Text style={styles.title}>센터에서 어떤 수업을{'\n'}받고 있나요?</Text>
            <Text style={styles.lead}>
              센터 수업과 겹치지 않고 이어지는 집 활동을 만들어 드려요.
            </Text>
          </View>
          <View style={styles.chips}>
            {CENTER_OPTIONS.map((c) => (
              <Chip
                key={c}
                label={c}
                active={centers.includes(c)}
                onPress={() => setCenters(toggle(centers, c))}
              />
            ))}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              요즘 가장 신경 쓰이는 것은요? <Text style={styles.optional}>(여러 개 선택)</Text>
            </Text>
            <View style={styles.chips}>
              {CONCERN_OPTIONS.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={concerns.includes(c)}
                  onPress={() => setConcerns(toggle(concerns, c))}
                />
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>
              아이가 좋아하는 것 <Text style={styles.optional}>(선택 · 활동에 활용해요)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={likes}
              onChangeText={setLikes}
              maxLength={100}
              placeholder="예: 탁탁 두드리기, 기차, 비눗방울"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
              <Text style={styles.secondaryText}>이전</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }, working && styles.disabled]}
              disabled={working}
              onPress={finish}
            >
              {working ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>첫 활동 만들기</Text>
              )}
            </TouchableOpacity>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.title}>
            {curriculum ? '첫 활동이 준비됐어요' : '첫 활동을 만들고 있어요'}
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>오늘 집에서 할 활동</Text>
            {curriculum ? (
              curriculum.activities.map((a, i) => (
                <Text key={i} style={[styles.activity, i > 0 && styles.activityBorder]}>
                  {a.title} <Text style={styles.optional}>· {a.durationMin}분</Text>
                </Text>
              ))
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <View style={styles.row}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.lead}>
                  아이 정보를 보고 활동을 고르는 중이에요. 30초 정도 걸려요…
                </Text>
              </View>
            )}
          </View>
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>매일 이렇게 쓰면 돼요</Text>
            {[
              ['낮에 활동하고 결과 누르기', '잘했어요 · 조금 했어요 · 못 했어요'],
              ['저녁에 오늘 하루 기록 1분', '수업이 있었다면 선생님 말씀도 함께'],
              [
                '다음 날 아침, 새 활동 확인',
                '어제 기록을 보고 AI가 쉽게 또는 한 단계 높여 만들어요',
              ],
            ].map(([title, body], i) => (
              <View key={title} style={styles.flowRow}>
                <View style={styles.flowNum}>
                  <Text style={styles.flowNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flowTitle}>{title}</Text>
                  <Text style={styles.lead}>{body}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/family')}>
            <Text style={styles.secondaryText}>배우자도 함께 기록하도록 초대</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, working && styles.disabled]}
            disabled={working}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.primaryText}>오늘 시작하기</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 48, gap: 20, paddingBottom: spacing.xxl },
  stepText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  progress: { flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder },
  progressBarOn: { backgroundColor: colors.primary },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, lineHeight: 32 },
  lead: { fontSize: fontSize.sm, color: '#4A5A6A', lineHeight: 21, flexShrink: 1 },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  optional: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  input: {
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  chipTextActive: { fontWeight: '700', color: colors.primaryDark },
  note: {
    fontSize: 13,
    color: '#4A5A6A',
    backgroundColor: '#F2F0EC',
    borderRadius: borderRadius.md,
    padding: 12,
    lineHeight: 20,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  primaryBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, color: colors.text },
  disabled: { opacity: 0.45 },
  error: { fontSize: fontSize.sm, color: '#B4442F' },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: 10,
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  activity: { fontSize: 15, color: colors.text },
  activityBorder: { borderTopWidth: 1, borderTopColor: '#F0EDE8', paddingTop: 10 },
  flowRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flowNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  flowTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
});
