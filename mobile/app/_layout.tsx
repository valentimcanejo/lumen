import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { OfflineBanner } from "../components/ui/lumen/OfflineBanner";
import "../i18n";
import { loadLanguage } from "../i18n/setLanguage";
import "@/global.css";
import { auth } from "../firebase/firebaseConfig";
import { getUser, getCompletedContentIds } from "../repositories/user.repo";
import { getLessonMeta, pickNextLesson } from "../repositories/lessons.repo";
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
    AsyncStorage.getItem("hasOnboarded").then((val) => {
      if (val !== "true") {
        router.replace("/(onboarding)/welcome");
      }
    });
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          const notifData = response.notification.request.content.data as Record<string, unknown> | null;

          // Review notification → go to review screen
          if (notifData?.type === "review") {
            router.push("/(session)/review");
            return;
          }

          const uid = auth.currentUser?.uid;
          if (!uid) return;

          const [user, completedIds] = await Promise.all([
            getUser(uid),
            getCompletedContentIds(uid),
          ]);
          const trackIds = user?.selectedTrackIds ?? user?.selectedGoalIds ?? [];
          if (!trackIds.length) return;

          const today = todayYmd();
          const contentId = pickNextLesson(trackIds, completedIds, today);
          if (!contentId) return;
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
          // silently ignore errors in notification handler
        }
      },
    );
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
        <Stack.Screen
          name="(onboarding)"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="track/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/intro"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/lesson"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/cards"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/quiz"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/summary"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(session)/review"
          options={{ animation: "slide_from_right" }}
        />
      </Stack>
      <OfflineBanner />
      <StatusBar style="light" />
    </GluestackUIProvider>
  );
}
