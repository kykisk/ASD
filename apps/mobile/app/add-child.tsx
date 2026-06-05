import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useChildStore } from '../stores/child.store.js';
import { useCreateChild } from '../hooks/use-children.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: '남자' },
  { value: 'FEMALE', label: '여자' },
  { value: 'OTHER', label: '기타' },
];

export default function AddChildScreen() {
  const router = useRouter();
  const familyId = useChildStore((s) => s.familyId);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [diagnosisName, setDiagnosisName] = useState('');

  const createChild = useCreateChild(familyId ?? null);

  const handleBirthDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length > 6)
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    setBirthDate(formatted.slice(0, 10));
  };

  const validate = (): string | null => {
    if (!name.trim()) return '이름을 입력해주세요';
    if (!birthDate || birthDate.length !== 10) return '생년월일을 YYYY-MM-DD 형식으로 입력해주세요';
    const d = new Date(birthDate);
    if (isNaN(d.getTime()) || d > new Date()) return '올바른 생년월일을 입력해주세요';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      if (Platform.OS === 'web') {
        window.alert(error);
      } else {
        Alert.alert('입력 오류', error);
      }
      return;
    }

    try {
      await createChild.mutateAsync({
        name: name.trim(),
        birthDate,
        ...(gender ? { gender } : {}),
        ...(diagnosisName.trim() ? { diagnosisName: diagnosisName.trim() } : {}),
      });
      router.back();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('아이 추가에 실패했습니다. 다시 시도해주세요.');
      } else {
        Alert.alert('오류', '아이 추가에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: '아이 추가', headerShown: true }} />

      <View style={styles.section}>
        <Text style={styles.label}>
          이름 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="아이 이름"
          placeholderTextColor={colors.textMuted}
          maxLength={20}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          생년월일 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={handleBirthDateChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>성별</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.genderBtn, gender === opt.value && styles.genderBtnActive]}
              onPress={() => setGender(gender === opt.value ? null : opt.value)}
            >
              <Text
                style={[styles.genderBtnText, gender === opt.value && styles.genderBtnTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>진단명</Text>
        <TextInput
          style={styles.input}
          value={diagnosisName}
          onChangeText={setDiagnosisName}
          placeholder="예: 자폐스펙트럼장애"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />
      </View>

      <Text style={styles.hint}>
        💡 발달 수준, 치료 센터 정보는 추가 후 아이 프로필에서 입력할 수 있어요
      </Text>

      <TouchableOpacity
        style={[styles.submitBtn, createChild.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={createChild.isPending}
      >
        {createChild.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>아이 추가</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelBtnText}>취소</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  section: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  genderBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  genderBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  genderBtnTextActive: { color: colors.primary, fontWeight: '600' },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' },
  cancelBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: fontSize.md },
});
