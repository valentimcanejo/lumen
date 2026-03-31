import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { listenAuth, ensureAnonymousAuth } from "../services/auth.service";
import { getUser } from "../repositories/user.repo";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const unsub = listenAuth(async (firebaseUser) => {
      if (firebaseUser === null) return; // wait for auth to settle
      const user = await getUser(firebaseUser.uid).catch(() => null);
      setHasOnboarded(user?.hasOnboarded === true);
      setReady(true);
      unsub();
    });
    return unsub;
  }, []);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0B0F14",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#F5C77A" />
      </View>
    );
  }

  return hasOnboarded ? (
    <Redirect href="/(tabs)/home" />
  ) : (
    <Redirect href="/(onboarding)/welcome" />
  );
}
