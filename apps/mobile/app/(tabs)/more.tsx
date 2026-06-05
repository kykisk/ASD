import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store.js';
import { ChildSwitcher } from '../../components/ChildSwitcher.js';
import { useChildStore } from '../../stores/child.store.js';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme.js';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const selectedChild = useChildStore((s) => s.getSelectedChild());
  const [childSwitcherVisible, setChildSwitcherVisible] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃하시겠습니까?')) {
        logout();
      }
    } else {
      Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: logout },
      ]);
    }
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

      {selectedChild && (
        <TouchableOpacity style={styles.childCard} onPress={() => setChildSwitcherVisible(true)}>
          <View style={styles.childCardContent}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{selectedChild.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.childCardName}>{selectedChild.name}</Text>
              <Text style={styles.childCardHint}>탭하여 아이 전환</Text>
            </View>
          </View>
          <Text style={styles.switchArrow}>⇄</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionLabel}>치료 도구</Text>
      <View style={styles.section}>
        <MenuItem label="아이 프로필" icon="👤" onPress={() => router.push('/child-profile')} />
        <MenuItem label="감각 프로파일" icon="🎯" onPress={() => router.push('/sensory-profile')} />
        <MenuItem label="보고서" icon="📊" onPress={() => router.push('/reports')} />
      </View>

      <Text style={styles.sectionLabel}>부모 지원</Text>
      <View style={styles.section}>
        <MenuItem label="웰빙 체크인" icon="💚" onPress={() => router.push('/wellbeing')} />
        <MenuItem label="비상 가이드" icon="🆘" onPress={() => router.push('/emergency-guide')} />
        <MenuItem label="연구 브리핑" icon="📰" onPress={() => router.push('/research')} />
      </View>

      <Text style={styles.sectionLabel}>가족</Text>
      <View style={styles.section}>
        <MenuItem label="아이 추가" icon="➕" onPress={() => router.push('../add-child')} />
        <MenuItem label="가족 설정" icon="👨‍👩‍👧" onPress={() => router.push('/family')} />
        <MenuItem label="설정" icon="⚙️" onPress={() => router.push('/settings')} />
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

function MenuItem({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
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
  avatarText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.md,
  },
  childCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },
  childCardName: { fontSize: fontSize.md, fontWeight: '600', color: colors.primaryDark },
  childCardHint: { fontSize: fontSize.xs, color: colors.primary },
  switchArrow: { fontSize: fontSize.xl, color: colors.primary },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.xs,
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
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuIcon: { fontSize: fontSize.xl, width: 28 },
  menuLabel: { fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: fontSize.xl, color: colors.textMuted },
  logoutButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: { fontSize: fontSize.md, color: colors.error, fontWeight: '500' },
});
