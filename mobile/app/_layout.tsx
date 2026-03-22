import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
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
        }}
      />
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
