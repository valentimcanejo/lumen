import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
const ID_DAILY_REMINDER = "daily-reminder";
const ID_REVIEW         = "review-reminder";

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
  await Notifications.cancelScheduledNotificationAsync(ID_DAILY_REMINDER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_DAILY_REMINDER,
    content: { title, body, data: { type: "daily-reminder" } },
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

// ---------------------------------------------------------------------------
// Smart daily reminder — learns the user's best study hour from last 14 sessions
// ---------------------------------------------------------------------------

const SMART_HOURS_KEY = "smart_notif_hours";
const SMART_WINDOW = 14; // sessions kept for analysis
const SMART_MIN_DATA = 5; // minimum sessions before adapting (falls back to 9am)
const ID_SMART_REMINDER = "smart-daily-reminder";

function modeHour(hours: number[]): number {
  const freq: Record<number, number> = {};
  for (const h of hours) freq[h] = (freq[h] ?? 0) + 1;
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
}

export async function recordSessionAndScheduleSmartReminder(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const currentHour = new Date().getHours();

  // Update rolling window
  const raw = await AsyncStorage.getItem(SMART_HOURS_KEY);
  const hours: number[] = raw ? JSON.parse(raw) : [];
  hours.push(currentHour);
  if (hours.length > SMART_WINDOW) hours.splice(0, hours.length - SMART_WINDOW);
  await AsyncStorage.setItem(SMART_HOURS_KEY, JSON.stringify(hours));

  const targetHour = hours.length >= SMART_MIN_DATA ? modeHour(hours) : 9;

  await Notifications.cancelScheduledNotificationAsync(ID_SMART_REMINDER).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_SMART_REMINDER,
    content: { title, body, data: { type: "smart-reminder" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: targetHour,
      minute: 0,
    },
  });
}

export async function scheduleReviewReminder(
  title: string,
  body: string,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID_REVIEW).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID_REVIEW,
    content: { title, body, data: { type: "review" } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60,
      repeats: false,
    },
  });
}
