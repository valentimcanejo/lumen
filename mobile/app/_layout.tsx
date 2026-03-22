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
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/home");
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
