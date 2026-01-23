import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import "../i18n";
import "@/global.css";

export default function RootLayout() {
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
