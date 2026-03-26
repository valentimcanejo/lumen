import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Stable identifiers — allows cancel/replace without storing returned IDs
const ID_STREAK_RISK    = "streak-risk";
const ID_DAILY_MISSION  = "daily-mission";

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ---------------------------------------------------------------------------
// 1. Streak at-risk — one-shot at 8 pm, rescheduled after every session
// ---------------------------------------------------------------------------

export async function scheduleStreakRiskNotification(
  streak: number,
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  // Next 8 pm: if it's already past 8 pm today, target tomorrow
  const next8pm = new Date();
  next8pm.setHours(20, 0, 0, 0);
  if (next8pm <= new Date()) next8pm.setDate(next8pm.getDate() + 1);

  // Replace any existing streak-risk notification
  await Notifications.cancelScheduledNotificationAsync(ID_STREAK_RISK).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_STREAK_RISK,
    content: {
      title,
      body,
      data: { type: "streak-risk", streak },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next8pm,
    },
  });
}

export async function cancelStreakRiskNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_STREAK_RISK).catch(() => {});
}

// ---------------------------------------------------------------------------
// 2. Daily mission — repeating every day at 9 am
// ---------------------------------------------------------------------------

export async function scheduleDailyMissionNotification(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  // Scheduling with same identifier replaces the previous one — safe to call repeatedly
  await Notifications.scheduleNotificationAsync({
    identifier: ID_DAILY_MISSION,
    content: { title, body, data: { type: "daily-mission" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

// ---------------------------------------------------------------------------
// Legacy helpers kept for backward compat
// ---------------------------------------------------------------------------

export async function scheduleDailyReminder(
  hour = 8,
  minute = 0,
  title: string,
  body: string,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReviewReminder(
  title: string,
  body: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { type: "review" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60,
      repeats: false,
    },
  });
}
