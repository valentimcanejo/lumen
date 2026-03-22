import { useEffect, useState } from "react";
import * as Network from "expo-network";
import { AppState, type AppStateStatus } from "react-native";

export function useNetworkStatus(): boolean {
  const [isConnected, setIsConnected] = useState(true);

  async function check() {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isInternetReachable !== false);
    } catch {
      // if the check itself fails, assume connected to avoid false negatives
    }
  }

  useEffect(() => {
    check();

    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") check();
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isConnected;
}
