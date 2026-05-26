import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthStore } from '../stores/auth.store.js';
import { useFamily } from '../hooks/use-family.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const ROLE_LABELS: Record<string, string> = {
  FAMILY_ADMIN: '관리자',
  FAMILY_MEMBER: '가족',
};

export default function FamilyScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: family, isLoading, error } = useFamily(user?.familyId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '가족 설정', headerShown: true }} />

      {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>가족 정보를 불러올 수 없습니다</Text>
          <Text style={styles.errorHint}>가족을 먼저 만들어주세요</Text>
        </View>
      )}

      {family && (
        <>
          <View style={styles.familyHeader}>
            <View style={styles.familyIcon}>
              <Text style={styles.familyIconText}>👨‍👩‍👧</Text>
            </View>
            <Text style={styles.familyName}>{family.name}</Text>
            <Text style={styles.memberCount}>{family.members.length}명</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>가족 구성원</Text>
            {family.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{member.user.name.charAt(0)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.user.name}
                    {member.user.id === user?.id ? ' (나)' : ''}
                  </Text>
                  <Text style={styles.memberEmail}>{member.user.email}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    member.role === 'FAMILY_ADMIN' && styles.roleBadgeAdmin,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      member.role === 'FAMILY_ADMIN' && styles.roleTextAdmin,
                    ]}
                  >
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {!family && !isLoading && !error && (
        <View style={styles.card}>
          <Text style={styles.emptyText}>가족이 등록되어 있지 않습니다</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loader: { marginTop: spacing.xxl },
  errorCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: { fontSize: fontSize.md, color: colors.error, fontWeight: '500' },
  errorHint: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  familyHeader: { alignItems: 'center', paddingVertical: spacing.lg },
  familyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  familyIconText: { fontSize: 32 },
  familyName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  memberCount: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: fontSize.md, fontWeight: '500', color: colors.text },
  memberEmail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  roleBadgeAdmin: { backgroundColor: colors.primaryLight },
  roleText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  roleTextAdmin: { color: colors.primary },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center' },
});
