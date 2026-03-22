import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { OfflineBanner } from "../components/ui/lumen/OfflineBanner";
import "../i18n";
import { loadLanguage } from "../i18n/setLanguage";
import "@/global.css";
import { auth } from "../firebase/firebaseConfig";
import { getUser } from "../repositories/user.repo";
import { getLessonMeta } from "../repositories/lessons.repo";
import { todayYmd } from "../repositories/session.repo";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          router.push("/(tabs)/home");
          return;
        }

        const user = await getUser(uid);
        const goalIds = user?.selectedGoalIds ?? [];
        if (!goalIds.length) {
          router.push("/(tabs)/home");
          return;
        }

        const today = todayYmd();
        const n = today.replace(/-/g, "").split("").reduce((a, c) => a * 10 + Number(c), 0);
        const contentId = goalIds[n % goalIds.length];
        const meta = getLessonMeta(contentId);
        const lang = user?.lang ?? "pt";

        router.push({
          pathname: "/(session)/intro",
          params: {
            contentId,
            version: String(meta?.version ?? 1),
            lang,
            title: meta?.title[lang] ?? meta?.title.en ?? contentId,
            difficulty: String(meta?.difficulty ?? 1),
            estimatedMinutes: String(meta?.estimatedMinutes ?? 0),
          },
        });
      } catch {
        router.push("/(tabs)/home");
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GluestackUIProvider mode="dark">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B0F14" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
        <Stack.Screen name="(onboarding)" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="track/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(session)/intro" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(session)/lesson" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(session)/cards" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(session)/quiz" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="(session)/summary" options={{ animation: "slide_from_right" }} />
      </Stack>
      <OfflineBanner />
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
