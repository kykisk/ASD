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

type TabType = 'recommended' | 'bookmarked';

export default function ResearchScreen() {
  const { data: articles, isLoading } = useResearchFeed();
  const bookmarkMutation = useBookmarkArticle();
  const markReadMutation = useMarkAsRead();
  const [activeTab, setActiveTab] = useState<TabType>('recommended');

  const filteredArticles =
    articles?.filter((a) => {
      if (activeTab === 'bookmarked') return a.isBookmarked;
      return true;
    }) ?? [];

  const handleBookmark = (article: ResearchMatch) => {
    bookmarkMutation.mutate({ articleId: article.id, bookmarked: !article.isBookmarked });
  };

  const handlePress = (article: ResearchMatch) => {
    if (!article.isRead) {
      markReadMutation.mutate({ articleId: article.id });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '연구 브리핑', headerShown: true }} />

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommended' && styles.tabActive]}
          onPress={() => setActiveTab('recommended')}
        >
          <Text style={[styles.tabText, activeTab === 'recommended' && styles.tabTextActive]}>
            추천
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookmarked' && styles.tabActive]}
          onPress={() => setActiveTab('bookmarked')}
        >
          <Text style={[styles.tabText, activeTab === 'bookmarked' && styles.tabTextActive]}>
            북마크
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {isLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      )}

      {/* Empty state */}
      {!isLoading && filteredArticles.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {activeTab === 'bookmarked'
              ? '북마크한 연구가 없습니다'
              : '매주 월요일 최신 ASD 연구가 자동으로 업데이트됩니다'}
          </Text>
        </View>
      )}

      {/* Article cards */}
      {filteredArticles.map((article) => (
        <TouchableOpacity key={article.id} style={styles.card} onPress={() => handlePress(article)}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.articleTitle} numberOfLines={2}>
                {article.title}
              </Text>
              <Text style={styles.articleMeta}>
                {article.journal} · {new Date(article.publishedDate).toLocaleDateString('ko-KR')}
              </Text>
            </View>
            <TouchableOpacity style={styles.bookmarkBtn} onPress={() => handleBookmark(article)}>
              <Text style={styles.bookmarkIcon}>{article.isBookmarked ? '🔖' : '📑'}</Text>
            </TouchableOpacity>
          </View>

          {/* Tags */}
          {article.tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
              <View style={styles.tagsRow}>
                {article.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Korean summary */}
          <Text style={styles.summary} numberOfLines={3}>
            {article.koreanSummary}
          </Text>

          {/* Key findings */}
          {article.keyFindings.length > 0 && (
            <View style={styles.findingsSection}>
              {article.keyFindings.slice(0, 3).map((finding, idx) => (
                <View key={idx} style={styles.findingRow}>
                  <Text style={styles.findingBullet}>•</Text>
                  <Text style={styles.findingText}>{finding}</Text>
                </View>
              ))}
            </View>
          )}

          {!article.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      ))}
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
  tabActive: {
    backgroundColor: colors.primaryLight,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: { flex: 1, marginRight: spacing.sm },
  articleTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  articleMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
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
  summary: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  findingsSection: { marginTop: spacing.sm },
  findingRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
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
