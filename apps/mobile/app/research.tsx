import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  useResearchFeed,
  useBookmarkArticle,
  useMarkAsRead,
  useGenerateAiDigest,
  useDigestHistory,
} from '../hooks/use-research.js';
import type { ResearchMatch, AiDigestResult, DigestHistoryItem } from '../hooks/use-research.js';
import { useChildStore } from '../stores/child.store.js';
import { colors, spacing, borderRadius, fontSize } from '../constants/theme.js';

type TabKey = 'recommended' | 'bookmarked' | 'digest';

function DigestHistoryCard({ item }: { item: DigestHistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const topArticles = (item.topArticles ?? []) as { title: string; reason: string }[];
  const dateLabel = new Date(item.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const preview = item.digest.replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 80);

  return (
    <View style={digestStyles.card}>
      <TouchableOpacity style={digestStyles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={digestStyles.headerLeft}>
          <Text style={digestStyles.sparkle}>✨</Text>
          <View style={digestStyles.headerTextWrap}>
            <Text style={digestStyles.dateText}>{dateLabel} 생성</Text>
            {!expanded && (
              <Text style={digestStyles.previewText} numberOfLines={1}>
                {preview}...
              </Text>
            )}
          </View>
        </View>
        <Text style={digestStyles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={digestStyles.body}>
          <Text style={digestStyles.digestText}>{item.digest}</Text>
          {topArticles.length > 0 && (
            <View style={digestStyles.topSection}>
              <Text style={digestStyles.topLabel}>TOP 추천 논문</Text>
              {topArticles.map((a, i) => (
                <View key={i} style={digestStyles.topRow}>
                  <View style={digestStyles.badge}>
                    <Text style={digestStyles.badgeText}>{i + 1}</Text>
                  </View>
                  <View style={digestStyles.topContent}>
                    <Text style={digestStyles.topTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                    {a.reason ? <Text style={digestStyles.topReason}>{a.reason}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ArticleDetailModal({ item, onClose }: { item: ResearchMatch; onClose: () => void }) {
  const a = item.article;
  const dateLabel = a.publishedAt
    ? new Date(a.publishedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const tags: string[] = Array.isArray(a.tags) ? a.tags : [];
  const keyFindings: string[] = Array.isArray(a.keyFindings) ? a.keyFindings : [];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.journal} numberOfLines={1}>
            {a.journal}
          </Text>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={modalStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.body} contentContainerStyle={modalStyles.bodyContent}>
          <Text style={modalStyles.title}>{a.title}</Text>
          {dateLabel ? <Text style={modalStyles.date}>📅 {dateLabel}</Text> : null}

          {tags.length > 0 && (
            <View style={modalStyles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={i} style={modalStyles.tagBadge}>
                  <Text style={modalStyles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {a.koreanSummary ? (
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>✨ AI 한국어 요약</Text>
              <Text style={modalStyles.sectionText}>{a.koreanSummary}</Text>
            </View>
          ) : null}

          {a.abstract ? (
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>📄 원문 초록 (Abstract)</Text>
              <Text style={modalStyles.sectionText}>{a.abstract}</Text>
            </View>
          ) : null}

          {keyFindings.length > 0 && (
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>🔍 핵심 발견</Text>
              {keyFindings.map((f, i) => (
                <View key={i} style={modalStyles.findingRow}>
                  <Text style={modalStyles.findingBullet}>•</Text>
                  <Text style={modalStyles.findingText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity style={modalStyles.closeFullBtn} onPress={onClose}>
            <Text style={modalStyles.closeFullText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function ResearchScreen() {
  const { selectedChildId } = useChildStore();
  const { data: articles, isLoading } = useResearchFeed();
  const bookmarkMutation = useBookmarkArticle();
  const markReadMutation = useMarkAsRead();
  const generateDigest = useGenerateAiDigest();
  const { data: digests, isLoading: digestsLoading } = useDigestHistory(selectedChildId);
  const [activeTab, setActiveTab] = useState<TabKey>('recommended');
  const [liveDigest, setLiveDigest] = useState<AiDigestResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<ResearchMatch | null>(null);

  const filteredArticles =
    articles?.filter((a) => (activeTab === 'bookmarked' ? a.isBookmarked : true)) ?? [];

  const handleBookmark = (item: ResearchMatch) => {
    bookmarkMutation.mutate(item.articleId);
  };

  const handlePress = (item: ResearchMatch) => {
    if (!item.isRead) markReadMutation.mutate(item.articleId);
    setSelectedItem(item);
  };

  const handleGenerateDigest = async () => {
    if (!selectedChildId) return;
    const result = await generateDigest.mutateAsync(selectedChildId);
    setLiveDigest(result);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'recommended', label: '추천' },
    { key: 'bookmarked', label: '북마크' },
    { key: 'digest', label: 'AI 요약' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '연구 브리핑', headerShown: true }} />

      {selectedItem && (
        <ArticleDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {/* AI Generate Button */}
      {selectedChildId && (
        <TouchableOpacity
          style={[styles.generateBtn, generateDigest.isPending && styles.generateBtnDisabled]}
          onPress={handleGenerateDigest}
          disabled={generateDigest.isPending}
        >
          {generateDigest.isPending ? (
            <View style={styles.generateBtnContent}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.generateBtnText}>AI 분석 중...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>✨ AI 맞춤 요약</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Live Digest Result */}
      {liveDigest && (
        <View style={styles.liveDigestCard}>
          <View style={styles.liveDigestHeader}>
            <Text style={styles.liveDigestTitle}>✨ AI 맞춤 연구 요약</Text>
            <TouchableOpacity onPress={() => setLiveDigest(null)}>
              <Text style={styles.liveDigestClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.liveDigestMeta}>
            {new Date(liveDigest.generatedAt).toLocaleString('ko-KR')}
          </Text>
          <Text style={styles.liveDigestBody}>{liveDigest.digest}</Text>
          {liveDigest.topArticles.length > 0 && (
            <View style={digestStyles.topSection}>
              <Text style={digestStyles.topLabel}>TOP 추천 논문</Text>
              {liveDigest.topArticles.map((a, i) => (
                <View key={i} style={digestStyles.topRow}>
                  <View style={digestStyles.badge}>
                    <Text style={digestStyles.badgeText}>{i + 1}</Text>
                  </View>
                  <View style={digestStyles.topContent}>
                    <Text style={digestStyles.topTitle} numberOfLines={1}>
                      {a.title}
                    </Text>
                    {a.reason ? <Text style={digestStyles.topReason}>{a.reason}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed / Bookmarks Tab */}
      {(activeTab === 'recommended' || activeTab === 'bookmarked') && (
        <>
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
              ? new Date(a.publishedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                })
              : '';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, item.isRead && styles.cardRead]}
                onPress={() => handlePress(item)}
                activeOpacity={0.85}
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
                    {keyFindings.slice(0, 2).map((f, idx) => (
                      <View key={idx} style={styles.findingRow}>
                        <Text style={styles.findingBullet}>•</Text>
                        <Text style={styles.findingText} numberOfLines={1}>
                          {f}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.expandBtn}>
                  <Text style={styles.expandBtnText}>⊞ 전체 내용 보기</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* AI Digest History Tab */}
      {activeTab === 'digest' && (
        <>
          {digestsLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          )}

          {!digestsLoading && (!digests || digests.length === 0) && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                AI 요약 히스토리가 없습니다.{'\n'}상단의 '✨ AI 맞춤 요약' 버튼을 눌러 생성해보세요.
              </Text>
            </View>
          )}

          {digests?.map((d) => (
            <DigestHistoryCard key={d.id} item={d} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  generateBtnText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600' },
  liveDigestCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
  },
  liveDigestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  liveDigestTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primaryDark },
  liveDigestClose: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  liveDigestMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  liveDigestBody: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
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
  expandBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  expandBtnText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
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

const digestStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  sparkle: { fontSize: fontSize.lg },
  headerTextWrap: { flex: 1 },
  dateText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  previewText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: fontSize.xs, color: colors.textMuted },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  digestText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  topSection: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  topLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '700' },
  topContent: { flex: 1 },
  topTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  topReason: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  journal: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary, marginRight: spacing.sm },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: fontSize.md, color: colors.textSecondary },
  body: { flex: 1 },
  bodyContent: { padding: spacing.md, gap: spacing.lg },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, lineHeight: 24 },
  date: { fontSize: fontSize.xs, color: colors.textSecondary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  tagText: { fontSize: fontSize.xs, color: colors.primaryDark },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  findingRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  findingBullet: { fontSize: fontSize.sm, color: colors.primary, lineHeight: 20 },
  findingText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  closeFullBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeFullText: { fontSize: fontSize.sm, fontWeight: '600', color: '#fff' },
});
