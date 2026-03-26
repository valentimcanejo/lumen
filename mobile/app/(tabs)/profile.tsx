import React, { useState, useEffect } from "react";
import { Platform, ScrollView, ActivityIndicator, Linking, DevSettings, Alert, useWindowDimensions } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";

import { useUser, invalidateUserCache } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { setUserLanguage } from "../../repositories/user.repo";
import { getStudyHeatmap } from "../../repositories/progress.repo";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../services/notifications.service";
import { setLanguage as setI18nLanguage } from "../../i18n/setLanguage";
import type { Lang } from "../../models/lang";
import {
  levelXpThreshold,
  xpToLevel,
  xpForNextLevel,
  getLevelTier,
  type AchievementId,
  type UserProfile,
} from "../../models/user";
import { ACHIEVEMENTS } from "../../repositories/achievements.repo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";

// ---------------------------------------------------------------------------
// Heatmap helpers
// ---------------------------------------------------------------------------

const HEATMAP_WEEKS = 16;
const CELL_GAP = 3;

// Returns the Monday of the week that was `weeksAgo` weeks before today
function startMonday(weeksAgo: number): Date {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const d = new Date(today);
  d.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) - (weeksAgo - 1) * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ymd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function minutesToColor(minutes: number): string {
  if (minutes <= 0) return "#1A2233";
  if (minutes < 10) return "#1B4332";
  if (minutes < 20) return "#2D6A4F";
  if (minutes < 30) return "#40916C";
  return "#52B788";
}

// ---------------------------------------------------------------------------
// StudyHeatmap component
// ---------------------------------------------------------------------------

function StudyHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();

  // Available width = screenWidth - px-5*2 (40px) - card padding (32px)
  const availableWidth = screenWidth - 40 - 32;
  // day labels column ~20px
  const gridWidth = availableWidth - 24;
  const cellSize = Math.floor((gridWidth - CELL_GAP * (HEATMAP_WEEKS - 1)) / HEATMAP_WEEKS);

  const start = startMonday(HEATMAP_WEEKS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build columns: each column = one week (Mon=0 … Sun=6)
  // columns[col][row] = date string or null (future)
  const columns: (string | null)[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  let lastMonth = -1;
  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    const week: (string | null)[] = [];
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      if (d > today) {
        week.push(null);
      } else {
        const dateStr = ymd(d);
        week.push(dateStr);
        // Track month label at first Monday of that month
        if (row === 0 && d.getMonth() !== lastMonth) {
          monthLabels.push({ col, label: MONTHS_SHORT[d.getMonth()] });
          lastMonth = d.getMonth();
        }
      }
    }
    columns.push(week);
  }

  const dayLabels = (t("tabs.profile.heatmap_days", { returnObjects: true }) as string[]);

  return (
    <Box className="mb-6">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
        {t("tabs.profile.heatmap_title")}
      </Text>
      <Box className="bg-[#111827] rounded-2xl p-4">
        {/* Month labels */}
        <Box style={{ flexDirection: "row", marginLeft: 24, marginBottom: 4 }}>
          {monthLabels.map(({ col, label }) => (
            <Box
              key={col}
              style={{
                position: "absolute",
                left: col * (cellSize + CELL_GAP),
              }}
            >
              <Text style={{ color: "#7B8193", fontSize: 10 }}>{label}</Text>
            </Box>
          ))}
          {/* Spacer to give month row a height */}
          <Box style={{ height: 14 }} />
        </Box>

        {/* Day labels + grid */}
        <Box style={{ flexDirection: "row" }}>
          {/* Day-of-week labels: Mon, Wed, Fri */}
          <Box style={{ width: 20, marginRight: 4 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <Box
                key={row}
                style={{ height: cellSize, marginBottom: row < 6 ? CELL_GAP : 0, justifyContent: "center" }}
              >
                {(row === 1 || row === 3 || row === 5) && (
                  <Text style={{ color: "#7B8193", fontSize: 9 }}>
                    {dayLabels[row] ?? ""}
                  </Text>
                )}
              </Box>
            ))}
          </Box>

          {/* Cells */}
          <Box style={{ flexDirection: "row" }}>
            {columns.map((week, col) => (
              <Box
                key={col}
                style={{ marginRight: col < HEATMAP_WEEKS - 1 ? CELL_GAP : 0 }}
              >
                {week.map((dateStr, row) => {
                  const minutes = dateStr ? (heatmap[dateStr] ?? 0) : 0;
                  const bg = dateStr === null ? "transparent" : minutesToColor(minutes);
                  return (
                    <Box
                      key={row}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 2,
                        backgroundColor: bg,
                        marginBottom: row < 6 ? CELL_GAP : 0,
                      }}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Legend */}
        <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 8, gap: 4 }}>
          <Text style={{ color: "#7B8193", fontSize: 10, marginRight: 4 }}>
            {t("tabs.profile.heatmap_less")}
          </Text>
          {[0, 8, 15, 22, 30].map((m) => (
            <Box
              key={m}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: minutesToColor(m),
              }}
            />
          ))}
          <Text style={{ color: "#7B8193", fontSize: 10, marginLeft: 4 }}>
            {t("tabs.profile.heatmap_more")}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Account card
// ---------------------------------------------------------------------------

function AccountCard({
  isAnonymous,
  email,
  onSignInWithGoogle,
  onSignInWithApple,
  onSignOut,
}: {
  isAnonymous: boolean;
  email?: string | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithApple: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<"google" | "apple" | "signout" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handle(
    action: "google" | "apple" | "signout",
    fn: () => Promise<void>,
  ) {
    setLoading(action);
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (
        e.code !== "ERR_REQUEST_CANCELED" &&
        e.message !== "Google sign-in was cancelled or failed."
      ) {
        setError(t("common.error_connect"));
      }
    } finally {
      setLoading(null);
    }
  }

  if (isAnonymous) {
    return (
      <Box className="bg-[#111827] rounded-2xl p-5 mb-6">
        <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-1">
          {t("tabs.profile.account_save_progress")}
        </Text>
        <Text className="text-[#AAB0C0] text-[13px] mb-5">
          {t("tabs.profile.account_save_description")}
        </Text>

        <Pressable
          onPress={() => handle("google", onSignInWithGoogle)}
          disabled={loading !== null}
          className="flex-row items-center justify-center h-[52px] rounded-2xl bg-white mb-3 opacity-100 disabled:opacity-60"
        >
          {loading === "google" ? (
            <ActivityIndicator size="small" color="#0B0F14" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#0B0F14" />
              <Text className="text-[#0B0F14] text-[15px] font-semibold ml-2">
                {t("tabs.profile.account_google")}
              </Text>
            </>
          )}
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => handle("apple", onSignInWithApple)}
            disabled={loading !== null}
            className="flex-row items-center justify-center h-[52px] rounded-2xl bg-[#1C1C1E] border border-[#2A2A2E] disabled:opacity-60"
          >
            {loading === "apple" ? (
              <ActivityIndicator size="small" color="#E6EAF2" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#E6EAF2" />
                <Text className="text-[#E6EAF2] text-[15px] font-semibold ml-2">
                  {t("tabs.profile.account_apple")}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {error && (
          <Text className="text-[#E26D6D] text-[12px] mt-3 text-center">
            {error}
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box className="bg-[#111827] rounded-2xl p-5 mb-6">
      <HStack className="items-center mb-4" space="md">
        <Box className="w-10 h-10 rounded-full bg-[#1A2233] items-center justify-center">
          <Ionicons name="person" size={20} color="#F5C77A" />
        </Box>
        <VStack>
          <Text className="text-[#E6EAF2] text-[14px] font-semibold">
            {t("tabs.profile.account_linked")}
          </Text>
          {email ? (
            <Text className="text-[#AAB0C0] text-[12px]">{email}</Text>
          ) : (
            <Text className="text-[#AAB0C0] text-[12px]">
              {t("tabs.profile.account_synced")}
            </Text>
          )}
        </VStack>
      </HStack>

      <Pressable
        onPress={() => handle("signout", onSignOut)}
        disabled={loading !== null}
        className="flex-row items-center justify-center h-[44px] rounded-xl border border-[#1A2233] disabled:opacity-60"
      >
        {loading === "signout" ? (
          <ActivityIndicator size="small" color="#AAB0C0" />
        ) : (
          <Text className="text-[#AAB0C0] text-[14px]">
            {t("tabs.profile.account_sign_out")}
          </Text>
        )}
      </Pressable>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LanguageSelector({
  lang,
  onChange,
}: {
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <HStack className="flex flex-col gap-2">
      {(["pt", "en", "es"] as const).map((code) => (
        <Pressable
          key={code}
          onPress={() => onChange(code)}
          className="border border-[#AAB0C0] rounded-[16px] p-4"
        >
          <Text
            className={`text-[16px] ${lang === code ? "text-[#F5C77A]" : "text-[#AAB0C0]"}`}
          >
            {code === "pt"
              ? "Português"
              : code === "en"
                ? "English"
                : "Español"}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { loading, getUserData } = useUser();
  const { uid, user, isAnonymous, signInWithGoogle, signInWithApple, signOut } =
    useAuth();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<Lang>("pt");
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [enablingNotif, setEnablingNotif] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((u) => {
      if (!u) return;
      setProfileData(u);
      setLanguage(u.lang);
    });
    getStudyHeatmap(uid).then(setHeatmap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifGranted(status === "granted");
    });
  }, []);

  async function handleEnableNotifications() {
    setEnablingNotif(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        const title = t("onboarding.notifications.reminder_title");
        const body = t("onboarding.notifications.reminder_body");
        await scheduleDailyReminder(8, 0, title, body);
        setNotifGranted(true);
      } else {
        Linking.openSettings();
      }
    } finally {
      setEnablingNotif(false);
    }
  }

  const streak = profileData?.streak?.current ?? 0;
  const dailyGoal = profileData?.dailyGoalMin ?? 10;
  const xp = profileData?.xp ?? 0;
  const level = xpToLevel(xp);
  const tier = getLevelTier(level);
  const xpFloor = levelXpThreshold(level);
  const xpCeil = xpForNextLevel(level);
  const xpPct = xpCeil > xpFloor ? (xp - xpFloor) / (xpCeil - xpFloor) : 1;
  const unlockedAchievements = ACHIEVEMENTS.filter(
    (a) => !!profileData?.achievements?.[a.id as AchievementId],
  );

  const handleSaveChanges = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await Promise.all([
        setUserLanguage(uid, language),
        setI18nLanguage(language),
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="flex-1 bg-[#0B0F14]">
      <Box className="px-5" style={{ paddingTop: insets.top + 8 }}>
        <HStack className="items-center" space="md">
          <Pressable onPress={() => router.push("/(tabs)/home")}>
            <Ionicons name="chevron-back" size={22} color="#AAB0C0" />
          </Pressable>
          <Text className="text-[#E6EAF2] text-[20px] font-semibold">
            {t("tabs.profile.title")}
          </Text>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <AccountCard
          isAnonymous={isAnonymous}
          email={user?.email}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithApple={signInWithApple}
          onSignOut={signOut}
        />

        {loading ? (
          <Text className="text-[#AAB0C0]">{t("tabs.profile.loading")}</Text>
        ) : (
          <>
            {/* Stats row */}
            <HStack className="bg-[#111827] rounded-2xl p-4 mb-6" space="md">
              <VStack className="items-center flex-1" space="xs">
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.streak")}
                </Text>
                <Text className="text-[#F5C77A] text-[24px] font-semibold">
                  {streak}
                </Text>
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.streak_unit")}
                </Text>
              </VStack>
              <Box className="w-[1px] bg-[#1A2233]" />
              <VStack className="items-center flex-1" space="xs">
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.daily_goal")}
                </Text>
                <Text className="text-[#F5C77A] text-[24px] font-semibold">
                  {dailyGoal}
                </Text>
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.daily_goal_unit")}
                </Text>
              </VStack>
              <Box className="w-[1px] bg-[#1A2233]" />
              <VStack className="items-center flex-1" space="xs">
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.xp")}
                </Text>
                <Text className="text-[#F5C77A] text-[24px] font-semibold">
                  {xp}
                </Text>
                <Text className="text-[#7B8193] text-[11px]">
                  {t("tabs.profile.level")} {level}
                </Text>
              </VStack>
            </HStack>

            {/* Tier + XP progress */}
            <Box className="mb-6">
              <HStack className="items-center justify-between mb-3">
                <HStack className="items-center" space="sm">
                  <Box
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 100,
                      backgroundColor: `${tier.color}22`,
                      borderWidth: 1,
                      borderColor: `${tier.color}66`,
                    }}
                  >
                    <Text
                      style={{
                        color: tier.color,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {tier.name}
                    </Text>
                  </Box>
                  <Text className="text-[#AAB0C0] text-[13px]">
                    {t("tabs.profile.level")} {level}
                  </Text>
                </HStack>
                <Text className="text-[#7B8193] text-[12px]">
                  {xp} / {xpCeil} XP
                </Text>
              </HStack>
              <Box className="h-[6px] bg-[#1A2233] rounded-full overflow-hidden">
                <Box
                  className="h-full"
                  style={{
                    width: `${Math.min(xpPct * 100, 100)}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </Box>
            </Box>

            {/* Achievements */}
            {unlockedAchievements.length > 0 && (
              <Box className="mb-6">
                <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
                  {t("tabs.profile.achievements")}
                </Text>
                <HStack className="flex-wrap" space="sm">
                  {unlockedAchievements.map((a) => (
                    <VStack
                      key={a.id}
                      className="bg-[#111827] border border-[#1A2233] rounded-2xl px-3 py-3 items-center mb-2"
                      space="xs"
                      style={{ minWidth: 80 }}
                    >
                      <Text className="text-[22px]">{a.icon}</Text>
                      <Text className="text-[#AAB0C0] text-[10px] text-center">
                        {t(a.titleKey)}
                      </Text>
                    </VStack>
                  ))}
                </HStack>
              </Box>
            )}

            {/* Activity heatmap */}
            <StudyHeatmap heatmap={heatmap} />

            {/* Language */}
            <Box className="mb-6">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
                {t("tabs.profile.language")}
              </Text>
              <LanguageSelector
                lang={language}
                onChange={(l) => setLanguage(l as Lang)}
              />
            </Box>

            {/* Notifications */}
            <Box className="mb-6">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
                {t("tabs.profile.notifications")}
              </Text>
              <Box className="bg-[#111827] rounded-2xl p-4">
                <Text className="text-[#AAB0C0] text-[13px] mb-3">
                  {t("tabs.profile.notifications_hint")}
                </Text>
                {notifGranted ? (
                  <HStack className="items-center" space="sm">
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#5ED19A"
                    />
                    <Text className="text-[#5ED19A] text-[14px] font-semibold">
                      {t("tabs.profile.notifications_active")}
                    </Text>
                  </HStack>
                ) : (
                  <Pressable
                    onPress={handleEnableNotifications}
                    disabled={enablingNotif}
                    className="h-[44px] rounded-xl bg-[#1A2233] border border-[#F5C77A]/40 items-center justify-center"
                    style={{ opacity: enablingNotif ? 0.6 : 1 }}
                  >
                    {enablingNotif ? (
                      <ActivityIndicator size="small" color="#F5C77A" />
                    ) : (
                      <HStack className="items-center" space="sm">
                        <Ionicons
                          name="notifications-outline"
                          size={17}
                          color="#F5C77A"
                        />
                        <Text className="text-[#F5C77A] text-[14px] font-semibold">
                          {t("tabs.profile.notifications_enable")}
                        </Text>
                      </HStack>
                    )}
                  </Pressable>
                )}
              </Box>
            </Box>

            <Pressable
              onPress={handleSaveChanges}
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {saving ? t("tabs.profile.saving") : t("tabs.profile.save")}
              </Text>
            </Pressable>

            {/* DEV ONLY */}
            <Pressable
              onPress={() => {
                Alert.alert(
                  "[DEV] Reset completo",
                  "Apaga todos os dados do usuário no Firestore e reinicia o app. Não há volta.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Resetar tudo",
                      style: "destructive",
                      onPress: async () => {
                        if (!uid) return;
                        try {
                          // Delete all subcollection docs
                          const subcollections = [
                            "daily_sessions", "card_progress",
                            "completed_content", "saved_content", "stats",
                          ];
                          for (const sub of subcollections) {
                            const snap = await getDocs(collection(db, "users", uid, sub));
                            await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
                          }
                          // Delete user doc
                          await deleteDoc(doc(db, "users", uid));
                        } catch {
                          // ignore — proceed to clear local state anyway
                        }
                        invalidateUserCache(uid);
                        await AsyncStorage.clear();
                        DevSettings.reload();
                      },
                    },
                  ],
                );
              }}
              className="h-[44px] rounded-xl border border-[#E26D6D]/40 items-center justify-center mt-2"
            >
              <Text className="text-[#E26D6D] text-[13px] font-semibold">
                [DEV] Reset completo
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Box>
  );
}
