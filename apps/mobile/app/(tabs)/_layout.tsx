import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '../../constants/theme.js';
import { HelpHeaderButton } from '../../components/HelpHeaderButton.js';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{label}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '600' },
        headerRight: () => <HelpHeaderButton />,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.cardBorder,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="curriculum"
        options={{
          title: '커리큘럼',
          tabBarIcon: ({ focused }) => <TabIcon label="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="growth"
        options={{
          title: '성장',
          tabBarIcon: ({ focused }) => <TabIcon label="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="papers"
        options={{
          title: '논문',
          tabBarIcon: ({ focused }) => <TabIcon label="📰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '더보기',
          tabBarIcon: ({ focused }) => <TabIcon label="⋯" focused={focused} />,
        }}
      />
      {/* 탭에서는 빠졌지만 주소로는 열 수 있음: 평가(→ 오늘 하루 기록), 일정(→ 더보기 › 일정 달력) */}
      <Tabs.Screen name="assessment" options={{ href: null, title: '평가' }} />
      <Tabs.Screen name="schedule" options={{ href: null, title: '일정 달력' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: fontSize.xl,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
});
