// app/index.tsx
import { Redirect } from "expo-router";

// Depois você troca isso por um state real (AsyncStorage/Firestore)
const hasOnboarded = false;

export default function Index() {
  return hasOnboarded ? (
    <Redirect href="/(tabs)/home" />
  ) : (
    <Redirect href="/(onboarding)/welcome" />
  );
}
