import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { OfflineBanner } from "../components/ui/lumen/OfflineBanner";
import "../i18n";
import { loadLanguage } from "../i18n/setLanguage";
import "@/global.css";
import { auth } from "../firebase/firebaseConfig";
import { listenAuth, ensureAnonymousAuth } from "../services/auth.service";
import { getUser, getCompletedContentIds } from "../repositories/user.repo";
import {
  getLessonMeta,
  pickNextLesson,
  initLessons,
} from "../repositories/lessons.repo";
import { todayYmd } from "../repositories/session.repo";

SplashScreen.preventAutoHideAsync();

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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [lessonsReady, setLessonsReady] = useState(false);

  useEffect(() => {
    // Safety net: never block the splash indefinitely
    const timeout = setTimeout(() => setLessonsReady(true), 10_000);

    const unsub = listenAuth((u) => {
      unsub();
      // Fire-and-forget: don't await auth before fetching lessons
      if (u === null) ensureAnonymousAuth().catch(() => {});
      initLessons().finally(() => {
        clearTimeout(timeout);
        setLessonsReady(true);
      });
    });

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && lessonsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, lessonsReady]);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        try {
          const notifData = response.notification.request.content
            .data as Record<string, unknown> | null;

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
          const trackIds =
            user?.selectedTrackIds ?? user?.selectedGoalIds ?? [];
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
