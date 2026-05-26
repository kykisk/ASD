import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useChildStore } from '../stores/child.store.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

interface ChildSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function ChildSwitcher({ visible, onClose }: ChildSwitcherProps) {
  const { children, selectedChildId, selectChild } = useChildStore();

  const handleSelect = (id: string) => {
    selectChild(id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>아이 선택</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={children}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.childItem, item.id === selectedChildId && styles.childItemSelected]}
                onPress={() => handleSelect(item.id)}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{item.name}</Text>
                  {item.diagnosisName && (
                    <Text style={styles.childDiagnosis}>{item.diagnosisName}</Text>
                  )}
                </View>
                {item.id === selectedChildId && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>등록된 아이가 없습니다</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ 아이 추가</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ChildSwitcherButton() {
  const [visible, setVisible] = useState(false);
  const selectedChild = useChildStore((s) => s.getSelectedChild());

  return (
    <>
      <TouchableOpacity style={styles.switcherButton} onPress={() => setVisible(true)}>
        <View style={styles.switcherAvatar}>
          <Text style={styles.switcherAvatarText}>{selectedChild?.name?.charAt(0) ?? '?'}</Text>
        </View>
        <Text style={styles.switcherName} numberOfLines={1}>
          {selectedChild?.name ?? '아이 선택'}
        </Text>
        <Text style={styles.switcherArrow}>▾</Text>
      </TouchableOpacity>
      <ChildSwitcher visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  closeText: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.md,
  },
  childItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  childDiagnosis: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  addButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  switcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  switcherAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherAvatarText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  switcherName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    maxWidth: 80,
  },
  switcherArrow: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
