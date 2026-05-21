import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPreferences {
  assessmentAlerts: boolean;
  curriculumAlerts: boolean;
  weeklyInsights: boolean;
  inputReminders: boolean;
}

interface NotificationSettingsState extends NotificationPreferences {
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
}

export const useNotificationSettings = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      assessmentAlerts: true,
      curriculumAlerts: true,
      weeklyInsights: true,
      inputReminders: true,
      setPreference: (key, value) => set({ [key]: value }),
    }),
    { name: 'auticare-notification-settings' },
  ),
);
