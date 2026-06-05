import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useResearchFeed, useBookmarkArticle, useMarkAsRead } from '../hooks/use-research.js';
import type { ResearchMatch } from '../hooks/use-research.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

export default function ResearchScreen() {
  const { data: articles, isLoading } = useResearchFeed();
  const bookmarkMutation = useBookmarkArticle();
  const markReadMutation = useMarkAsRead();
  const [activeTab, setActiveTab] = useState<'recommended' | 'bookmarked'>('recommended');

  const filteredArticles =
    articles?.filter((a) => (activeTab === 'bookmarked' ? a.isBookmarked : true)) ?? [];

  const handleBookmark = (item: ResearchMatch) => {
    bookmarkMutation.mutate(item.articleId);
  };

  const handlePress = (item: ResearchMatch) => {
    if (!item.isRead) markReadMutation.mutate(item.articleId);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '연구 브리핑', headerShown: true }} />

      <View style={styles.tabRow}>
        {(['recommended', 'bookmarked'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'recommended' ? '추천' : '북마크'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      )}

      {!isLoading && filteredArticles.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {activeTab === 'bookmarked'
              ? '북마크한 연구가 없습니다'
              : '매주 월요일 최신 ASD 연구가 자동으로 업데이트됩니다'}
          </Text>
        </View>
      )}

      {filteredArticles.map((item) => {
        const a = item.article;
        const tags = a.tags ?? [];
        const keyFindings = a.keyFindings ?? [];
        const dateLabel = a.publishedAt
          ? new Date(a.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
          : '';

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, item.isRead && styles.cardRead]}
            onPress={() => handlePress(item)}
          >
            {!item.isRead && <View style={styles.unreadDot} />}

            <View style={styles.cardHeader}>
              <Text style={styles.articleTitle} numberOfLines={2}>
                {a.title}
              </Text>
              <TouchableOpacity style={styles.bookmarkBtn} onPress={() => handleBookmark(item)}>
                <Text style={styles.bookmarkIcon}>{item.isBookmarked ? '🔖' : '📑'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.articleMeta}>
              {a.journal}
              {dateLabel ? ` · ${dateLabel}` : ''}
            </Text>

            {tags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScroll}
              >
                <View style={styles.tagsRow}>
                  {tags.slice(0, 5).map((tag, idx) => (
                    <View key={idx} style={styles.tagBadge}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {a.koreanSummary ? (
              <Text style={styles.summary} numberOfLines={3}>
                {a.koreanSummary}
              </Text>
            ) : null}

            {keyFindings.length > 0 && (
              <View style={styles.findingsSection}>
                {keyFindings.slice(0, 3).map((f, idx) => (
                  <View key={idx} style={styles.findingRow}>
                    <Text style={styles.findingBullet}>•</Text>
                    <Text style={styles.findingText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { fontSize: fontSize.md, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    position: 'relative',
  },
  cardRead: { opacity: 0.75 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  articleTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginRight: spacing.sm,
  },
  articleMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  bookmarkBtn: { padding: spacing.xs },
  bookmarkIcon: { fontSize: 20 },
  tagsScroll: { marginTop: spacing.sm },
  tagsRow: { flexDirection: 'row', gap: spacing.xs },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.full,
  },
  tagText: { fontSize: fontSize.xs, color: colors.primary },
  summary: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, marginTop: spacing.sm },
  findingsSection: { marginTop: spacing.sm },
  findingRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  findingBullet: { fontSize: fontSize.sm, color: colors.primary, lineHeight: 20 },
  findingText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  unreadDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
