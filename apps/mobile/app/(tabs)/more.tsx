import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../stores/auth.store.js';
import { ChildSwitcher } from '../../components/ChildSwitcher.js';
import { useChildStore } from '../../stores/child.store.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const selectedChild = useChildStore((s) => s.getSelectedChild());
  const [childSwitcherVisible, setChildSwitcherVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || '사용자'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => setChildSwitcherVisible(true)}>
          <Text style={styles.menuLabel}>아이 전환</Text>
          <Text style={styles.menuValue}>{selectedChild?.name ?? '선택 없음'}</Text>
        </TouchableOpacity>
        <MenuItem label="아이 프로필" />
        <MenuItem label="일정 관리" />
        <MenuItem label="가족 설정" />
        <MenuItem label="보고서" />
        <MenuItem label="설정" />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <ChildSwitcher
        visible={childSwitcherVisible}
        onClose={() => setChildSwitcherVisible(false)}
      />
    </ScrollView>
  );
}

function MenuItem({ label }: { label: string }) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  menuLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  menuValue: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: fontSize.xl,
    color: colors.textMuted,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: '500',
  },
});
