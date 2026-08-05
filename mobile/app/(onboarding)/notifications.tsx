import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { VStack } from "../../components/ui/vstack";
import { router } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { Pressable } from "../../components/ui/pressable";
import { useTranslation } from "react-i18next";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../services/notifications.service";
import { trackEvent } from "../../services/analytics.service";

export default function NotificationsOnboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackEvent("onboarding_step", { step: "notifications" });
  }, []);

  async function handleAllow() {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDailyReminder(
          8,
          0,
          t("onboarding.notifications.reminder_title"),
          t("onboarding.notifications.reminder_body"),
        );
      }
    } finally {
      setLoading(false);
      router.replace("/(onboarding)/setup");
    }
  }

  function handleSkip() {
    router.replace("/(onboarding)/setup");
  }

  return (
    <Box
      className="flex-1 bg-[#0B0F14] px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) }}
    >
      <VStack className="flex-1 items-center justify-center" space="lg">
        <Text className="text-[64px]">🔔</Text>
        <Text className="text-[#E6EAF2] text-[26px] font-semibold text-center">
          {t("onboarding.notifications.title")}
        </Text>
        <Text className="text-[#AAB0C0] text-[15px] text-center leading-[22px]">
          {t("onboarding.notifications.subtitle")}
        </Text>
      </VStack>

      <VStack space="md">
        <LumenButton onPress={handleAllow} disabled={loading}>
          {loading ? "…" : t("onboarding.notifications.allow")}
        </LumenButton>
        <Pressable onPress={handleSkip} className="h-[48px] items-center justify-center">
          <Text className="text-[#7B8193] text-[15px]">
            {t("onboarding.notifications.skip")}
          </Text>
        </Pressable>
      </VStack>
    </Box>
  );
}
