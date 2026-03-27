import { Stack } from "expo-router";

export default function PremiumLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
        contentStyle: { backgroundColor: "#0B0F14" },
      }}
    />
  );
}
