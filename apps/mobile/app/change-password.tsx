import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { api } from '../lib/api.js';
import { useAuthStore } from '../stores/auth.store.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

/** 서버 비밀번호 규칙과 같음 */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return '8자 이상이어야 해요.';
  if (!/[A-Z]/.test(pw)) return '대문자를 포함해주세요.';
  if (!/[a-z]/.test(pw)) return '소문자를 포함해주세요.';
  if (!/[0-9]/.test(pw)) return '숫자를 포함해주세요.';
  if (!/[^A-Za-z0-9]/.test(pw)) return '특수문자를 포함해주세요.';
  return null;
}

/**
 * 비밀번호 바꾸기. 관리자가 임시 비밀번호를 발급한 계정(mustChangePassword)은
 * 로그인 직후 이 화면으로 오고, 바꾸기 전에는 다른 화면으로 갈 수 없다.
 * 바꾸면 서버가 모든 기기를 로그아웃시키므로 새 비밀번호로 다시 로그인한다.
 */
export default function ChangePasswordScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const forced = !!user?.mustChangePassword;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!current)
      return setError(forced ? '임시 비밀번호를 입력해주세요.' : '지금 비밀번호를 입력해주세요.');
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('새 비밀번호가 서로 달라요.');

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setDone(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ?? '비밀번호를 바꾸지 못했어요. 다시 시도해주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>비밀번호를 바꿨어요</Text>
        <Text style={styles.subtitle}>새 비밀번호로 다시 로그인해주세요.</Text>
        <TouchableOpacity style={[styles.button, { alignSelf: 'stretch' }]} onPress={logout}>
          <Text style={styles.buttonText}>로그인하러 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{forced ? '새 비밀번호를 정해주세요' : '비밀번호 바꾸기'}</Text>
        <Text style={styles.subtitle}>
          {forced
            ? '관리자가 보내드린 임시 비밀번호로 로그인하셨어요. 앞으로 쓸 비밀번호를 정하면 바로 시작할 수 있어요.'
            : '지금 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.'}
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>{forced ? '임시 비밀번호' : '지금 비밀번호'}</Text>
        <TextInput
          style={styles.input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>새 비밀번호</Text>
        <TextInput
          style={styles.input}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
        />
        <Text style={styles.hint}>8자 이상 · 대문자 · 소문자 · 숫자 · 특수문자</Text>

        <Text style={styles.label}>새 비밀번호 확인</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>비밀번호 바꾸기</Text>
          )}
        </TouchableOpacity>

        {forced && (
          <TouchableOpacity onPress={logout} style={styles.linkWrap}>
            <Text style={styles.link}>나중에 하기 (로그아웃)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textMuted },
  input: {
    height: 52,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  error: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.sm,
  },
  button: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
  linkWrap: { alignItems: 'center', marginTop: spacing.md },
  link: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
});
