import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "../../components/ui/box";
import { Text } from "../../components/ui/text";
import { Pressable } from "../../components/ui/pressable";
import { router, useLocalSearchParams } from "expo-router";
import { LumenButton } from "../../components/ui/lumen/Button";
import { useTranslation } from "react-i18next";
import { useUser } from "../../hooks/useUser";
import { useAuth } from "../../hooks/useAuth";
import { Lang } from "../../models/lang";

const OPTIONS = [
  { key: 5,  nameKey: "onboarding.daily-time.name_5",  desc: "onboarding.daily-time.desc_5" },
  { key: 10, nameKey: "onboarding.daily-time.name_10", desc: "onboarding.daily-time.desc_10" },
  { key: 15, nameKey: "onboarding.daily-time.name_15", desc: "onboarding.daily-time.desc_15" },
  { key: 20, nameKey: "onboarding.daily-time.name_20", desc: "onboarding.daily-time.desc_20" },
] as const;

export default function DailyTime() {
  const [minutes, setMinutes] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setUserPreferences } = useUser();
  const { uid } = useAuth();

  const { selectedLanguage, selectedTracks } =
    useLocalSearchParams() as {
      selectedLanguage: Lang;
      selectedTracks: string;
    };

  const handleNext = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      await setUserPreferences({
        userId: uid,
        lang: selectedLanguage as Lang,
        minutes,
        selectedTrackIds: selectedTracks?.split(",") || [],
      });

      router.push({
        pathname: `/(onboarding)/notifications`,
        params: { selectedLanguage, selectedMinutes: minutes, selectedTracks },
      });
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const selected = OPTIONS.find((o) => o.key === minutes)!;

  return (
    <Box className="flex-1 bg-[#0B0F14] px-6 pt-6">
      <Text className="text-[#E6EAF2] text-[26px] font-semibold">
        {t("onboarding.daily-time.title")}
      </Text>
      <Text className="text-[#AAB0C0] mt-2">
        {t("onboarding.daily-time.subtitle")}
      </Text>

      {/* Option cards */}
      <Box className="mt-8 gap-3">
        {OPTIONS.map((o) => {
          const active = o.key === minutes;
          return (
            <Pressable key={o.key} onPress={() => setMinutes(o.key)}>
              <Box
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 16,
                  backgroundColor: active ? "#1C2030" : "#111827",
                  borderWidth: 1.5,
                  borderColor: active ? "#F5C77A" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: active ? "#F5C77A" : "#E6EAF2",
                    fontSize: 16,
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {t(o.nameKey)}
                </Text>
                <Text
                  style={{
                    color: active ? "#F5C77A99" : "#AAB0C0",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  {o.key} min {t("onboarding.daily-time.per_day")}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </Box>

      {/* Description card */}
      <Box
        className="mt-4 bg-[#111827] rounded-2xl p-5"
        style={{ borderWidth: 1, borderColor: "#F5C77A33" }}
      >
        <Text className="text-[#AAB0C0] text-[14px] leading-5">
          {t(selected.desc)}
        </Text>
      </Box>

      <Box className="mt-auto" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
        <LumenButton onPress={handleNext} disabled={loading}>
          {loading ? "…" : t("onboarding.daily-time.continue")}
        </LumenButton>
      </Box>
    </Box>
  );
}
