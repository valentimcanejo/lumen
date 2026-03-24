import React, { useState, useEffect } from "react";
import { Platform, ScrollView, ActivityIndicator, Linking, DevSettings, Alert } from "react-native";
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

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((u) => {
      if (!u) return;
      setProfileData(u);
      setLanguage(u.lang);
    });
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
