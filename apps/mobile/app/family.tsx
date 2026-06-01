import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '../stores/auth.store.js';
import { useChildStore } from '../stores/child.store.js';
import { useFamily } from '../hooks/use-family.js';
import {
  useUpdateFamily,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '../hooks/use-family-edit.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

const ROLE_LABELS: Record<string, string> = { FAMILY_ADMIN: '관리자', FAMILY_MEMBER: '가족' };

export default function FamilyScreen() {
  const user = useAuthStore((s) => s.user);
  const storeFamilyId = useChildStore((s) => s.familyId);
  const familyId = user?.familyId ?? storeFamilyId;

  const { data: family, isLoading, error } = useFamily(familyId);
  const updateFamily = useUpdateFamily(familyId);
  const inviteMember = useInviteMember(familyId);
  const updateRole = useUpdateMemberRole(familyId);
  const removeMember = useRemoveMember(familyId);

  const [editingName, setEditingName] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'FAMILY_ADMIN' | 'FAMILY_MEMBER'>('FAMILY_MEMBER');
  const [showInvite, setShowInvite] = useState(false);

  const handleSaveName = async () => {
    if (!familyName.trim()) return;
    try {
      await updateFamily.mutateAsync(familyName.trim());
      setEditingName(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '저장 실패';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      setShowInvite(false);
      if (Platform.OS === 'web') {
        window.alert('초대했습니다');
      } else {
        Alert.alert('완료', '초대했습니다');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '초대 실패';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const handleToggleRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'FAMILY_ADMIN' ? 'FAMILY_MEMBER' : 'FAMILY_ADMIN';
    try {
      await updateRole.mutateAsync({ memberId, role: newRole });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '역할 변경 실패';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('오류', msg);
      }
    }
  };

  const handleRemove = (memberId: string, memberName: string) => {
    const doRemove = async () => {
      try {
        await removeMember.mutateAsync(memberId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '제거 실패';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('오류', msg);
        }
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`${memberName}님을 가족에서 제거하시겠습니까?`)) doRemove();
    } else {
      Alert.alert('멤버 제거', `${memberName}님을 가족에서 제거하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        { text: '제거', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '가족 설정', headerShown: true }} />

      {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>가족 정보를 불러올 수 없습니다</Text>
        </View>
      )}

      {family && (
        <>
          <View style={styles.familyHeader}>
            <View style={styles.familyIcon}>
              <Text style={styles.familyIconText}>👨‍👩‍👧</Text>
            </View>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={familyName}
                  onChangeText={setFamilyName}
                  autoFocus
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.saveInlineBtn}
                  onPress={handleSaveName}
                  disabled={updateFamily.isPending}
                >
                  {updateFamily.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveInlineBtnText}>저장</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelInlineBtn}
                  onPress={() => setEditingName(false)}
                >
                  <Text style={styles.cancelInlineBtnText}>취소</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setFamilyName(family.name);
                  setEditingName(true);
                }}
              >
                <Text style={styles.familyName}>
                  {family.name} <Text style={styles.editHint}>편집</Text>
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.memberCount}>{family.members.length}명</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>가족 구성원</Text>
              <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowInvite(true)}>
                <Text style={styles.inviteBtnText}>+ 초대</Text>
              </TouchableOpacity>
            </View>

            {family.members.map((member) => {
              const isMe = member.user.id === user?.id;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{member.user.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.user.name}
                      {isMe ? ' (나)' : ''}
                    </Text>
                    <Text style={styles.memberEmail}>{member.user.email}</Text>
                  </View>
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={[
                        styles.roleBadge,
                        member.role === 'FAMILY_ADMIN' && styles.roleBadgeAdmin,
                      ]}
                      onPress={() => !isMe && handleToggleRole(member.id, member.role)}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          member.role === 'FAMILY_ADMIN' && styles.roleTextAdmin,
                        ]}
                      >
                        {ROLE_LABELS[member.role]}
                      </Text>
                    </TouchableOpacity>
                    {!isMe && (
                      <TouchableOpacity onPress={() => handleRemove(member.id, member.user.name)}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <Modal visible={showInvite} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>멤버 초대</Text>
            <TextInput
              style={styles.modalInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="이메일 주소"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.roleRow}>
              {(['FAMILY_MEMBER', 'FAMILY_ADMIN'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, inviteRole === r && styles.roleOptionActive]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text
                    style={[styles.roleOptionText, inviteRole === r && styles.roleOptionTextActive]}
                  >
                    {ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInvite(false)}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!inviteEmail.trim() || inviteMember.isPending) && styles.saveBtnDisabled,
                ]}
                onPress={handleInvite}
                disabled={!inviteEmail.trim() || inviteMember.isPending}
              >
                {inviteMember.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>초대</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  editHint: { fontSize: fontSize.sm, color: colors.primary },
  memberCount: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  nameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  saveInlineBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  saveInlineBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  cancelInlineBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  cancelInlineBtnText: { color: colors.textSecondary, fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  inviteBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  inviteBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
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
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBorder,
  },
  roleBadgeAdmin: { backgroundColor: colors.primaryLight },
  roleText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  roleTextAdmin: { color: colors.primary },
  removeBtn: { fontSize: fontSize.md, color: colors.error, paddingHorizontal: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    height: 48,
  },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleOption: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleOptionText: { fontSize: fontSize.sm, color: colors.textSecondary },
  roleOptionTextActive: { color: '#fff', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: fontSize.md, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: fontSize.md, color: '#fff', fontWeight: '600' },
});
