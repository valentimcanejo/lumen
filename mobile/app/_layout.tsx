import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "../i18n";
import { loadLanguage } from "../i18n/setLanguage";
import "@/global.css";

export default function RootLayout() {
  useEffect(() => {
    loadLanguage();
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
