import React, { useState, useEffect } from "react";
import { Platform, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { VStack } from "@/components/ui/vstack";

import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { setUserLanguage } from "../../repositories/user.repo";
import { setLanguage as setI18nLanguage } from "../../i18n/setLanguage";
import type { Lang } from "../../models/lang";

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
  const [loading, setLoading] = useState<"google" | "apple" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(
    action: "google" | "apple" | "signout",
    fn: () => Promise<void>
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

function StreakInfo({ streak }: { streak: number }) {
  const { t } = useTranslation();
  return (
    <VStack className="items-center space-y-1">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold">
        {t("tabs.profile.streak")}
      </Text>
      <Text className="text-[#F5C77A] text-[32px] font-semibold">
        {streak} {t("tabs.profile.streak_unit")}
      </Text>
    </VStack>
  );
}

function DailyGoal({ goal }: { goal: number }) {
  const { t } = useTranslation();
  return (
    <VStack className="items-center space-y-1">
      <Text className="text-[#E6EAF2] text-[16px] font-semibold">
        {t("tabs.profile.daily_goal")}
      </Text>
      <Text className="text-[#F5C77A] text-[32px] font-semibold">
        {goal} {t("tabs.profile.daily_goal_unit")}
      </Text>
    </VStack>
  );
}

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
            {code === "pt" ? "Português" : code === "en" ? "English" : "Español"}
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
  const [language, setLanguage] = useState<Lang>("pt");
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);

  useEffect(() => {
    if (!uid) return;
    getUserData({ userId: uid }).then((u) => {
      if (!u) return;
      setLanguage(u.lang);
      setStreak(u.streak?.current ?? 0);
      setDailyGoal(u.dailyGoalMin ?? 10);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

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
      <Box className="px-5 pt-14">
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
            <Box className="mb-6">
              <StreakInfo streak={streak} />
            </Box>

            <Box className="mb-6">
              <DailyGoal goal={dailyGoal} />
            </Box>

            <Box className="mb-6">
              <Text className="text-[#E6EAF2] text-[16px] font-semibold mb-3">
                {t("tabs.profile.language")}
              </Text>
              <LanguageSelector
                lang={language}
                onChange={(l) => setLanguage(l as Lang)}
              />
            </Box>

            <Pressable
              onPress={handleSaveChanges}
              className="h-[52px] rounded-2xl bg-[#F5C77A] items-center justify-center"
            >
              <Text className="text-[#0B0F14] text-[16px] font-semibold">
                {saving ? t("tabs.profile.saving") : t("tabs.profile.save")}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Box>
  );
}
