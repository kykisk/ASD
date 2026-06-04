import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuthStore } from '../stores/auth.store.js';
import { useProfile, useUpdateProfile, useDataExport } from '../hooks/use-profile.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();
  const exportMutation = useDataExport();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const showErr = (msg: string) =>
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('입력 오류', msg);

    if (trimmed.length < 2) {
      showErr('이름은 2자 이상이어야 합니다');
      return;
    }
    if (!/^[가-힣a-zA-Z\s\-'.]+$/.test(trimmed)) {
      showErr('이름은 한글, 영문, 공백, 하이픈(-)만 입력 가능합니다\n숫자는 사용할 수 없습니다');
      return;
    }

    try {
      await updateMutation.mutateAsync({ name: trimmed });
      setEditingName(false);
      if (Platform.OS === 'web') {
        window.alert('이름이 업데이트되었습니다');
      } else {
        Alert.alert('저장됨', '이름이 업데이트되었습니다');
      }
    } catch (err: unknown) {
      const apiMsg = (err as any)?.response?.data?.error?.message;
      if (Platform.OS === 'web') {
        window.alert(apiMsg || '이름 변경에 실패했습니다');
      } else {
        Alert.alert('오류', apiMsg || '이름 변경에 실패했습니다');
      }
    }
  };

  const handleSavePhone = async () => {
    try {
      await updateMutation.mutateAsync({ phone: phone.trim() || null });
      setEditingPhone(false);
      Alert.alert('저장됨', '전화번호가 업데이트되었습니다');
    } catch {
      Alert.alert('오류', '전화번호 변경에 실패했습니다');
    }
  };

  const handleDataExport = async () => {
    Alert.alert(
      '내 데이터 내보내기',
      '모든 개인 데이터를 JSON 형식으로 다운로드합니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '내보내기',
          onPress: async () => {
            try {
              await exportMutation.mutateAsync();
              Alert.alert('완료', '데이터 내보내기가 완료되었습니다');
            } catch {
              Alert.alert('오류', '데이터 내보내기에 실패했습니다');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '설정', headerShown: true }} />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '설정', headerShown: true }} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>프로필 편집</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>이름</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={name}
                onChangeText={setName}
                autoFocus
                placeholder={profile?.name}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.fieldValueRow}
              onPress={() => {
                setName(profile?.name ?? '');
                setEditingName(true);
              }}
            >
              <Text style={styles.fieldValue}>{profile?.name ?? user?.name}</Text>
              <Text style={styles.editHint}>편집 ›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>이메일</Text>
          <Text style={styles.fieldValueReadonly}>{profile?.email ?? user?.email}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>전화번호</Text>
          {editingPhone ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={phone}
                onChangeText={setPhone}
                autoFocus
                placeholder="010-0000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePhone}>
                <Text style={styles.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.fieldValueRow}
              onPress={() => {
                setPhone(profile?.phone ?? '');
                setEditingPhone(true);
              }}
            >
              <Text style={styles.fieldValue}>{profile?.phone || '미입력'}</Text>
              <Text style={styles.editHint}>편집 ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>개인정보</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleDataExport}>
          {exportMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.actionLabel}>내 데이터 내보내기 (GDPR)</Text>
              <Text style={styles.actionArrow}>›</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>앱 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>버전</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>역할</Text>
          <Text style={styles.infoValue}>{profile?.role ?? user?.role ?? '-'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loader: { marginTop: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  field: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  fieldLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  fieldValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { fontSize: fontSize.md, color: colors.text },
  fieldValueReadonly: { fontSize: fontSize.md, color: colors.textSecondary },
  editHint: { fontSize: fontSize.sm, color: colors.primary },
  editRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  editInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  saveBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  actionLabel: { fontSize: fontSize.md, color: colors.text },
  actionArrow: { fontSize: fontSize.xl, color: colors.textMuted },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text },
});
