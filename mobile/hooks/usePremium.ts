import { useEffect, useCallback, useSyncExternalStore } from "react";
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from "react-native-purchases";
import { useAuth } from "./useAuth";
import { invalidateUserCache } from "./useUser";
import { getUser } from "../repositories/user.repo";

// ---------------------------------------------------------------------------
// Shared premium state — single source of truth across all usePremium() callers.
// Without this, each screen had its own isPremium state and only the paywall's
// instance flipped to true after purchase, so other screens needed an app
// restart to notice.
// ---------------------------------------------------------------------------
type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  packages: PurchasesPackage[];
};

let state: PremiumState = { isPremium: false, loading: true, packages: [] };
let initializedForUid: string | null = null;
const listeners = new Set<() => void>();

function setState(partial: Partial<PremiumState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

async function init(uid: string) {
  try {
    // Check RevenueCat and Firestore in parallel.
    // RevenueCat is authoritative; Firestore is the webhook fallback
    // (covers cases where entitlement isn't configured yet or RC is unavailable).
    const [rcResult, firestoreUser] = await Promise.allSettled([
      Promise.all([Purchases.logIn(uid), Purchases.getOfferings()]),
      getUser(uid),
    ]);

    const rcPremium =
      rcResult.status === "fulfilled" &&
      !!rcResult.value[0].customerInfo.entitlements.active["premium"];

    const firestorePremium =
      firestoreUser.status === "fulfilled" &&
      firestoreUser.value?.premium?.isActive === true;

    setState({
      isPremium: rcPremium || firestorePremium,
      packages: rcResult.status === "fulfilled" ? (rcResult.value[1].current?.availablePackages ?? []) : [],
    });
  } catch {
    // fail silently
  } finally {
    setState({ loading: false });
  }
}

export function usePremium() {
  const { user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (!user?.uid || initializedForUid === user.uid) return;
    initializedForUid = user.uid;
    setState({ isPremium: false, loading: true, packages: [] });
    init(user.uid);
  }, [user?.uid]);

  const purchasePlan = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      await Purchases.purchasePackage(pkg);
      // Purchase resolved without error — activate optimistically for every screen.
      // Firestore will be updated via RevenueCat webhook.
      setState({ isPremium: true });
      if (user?.uid) invalidateUserCache(user.uid);
      return true;
    } catch (e: unknown) {
      if (e && typeof e === "object" && "userCancelled" in e && (e as { userCancelled: boolean }).userCancelled) {
        return false; // User dismissed the store dialog — stay on paywall silently
      }
      throw e;
    }
  }, [user?.uid]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const customerInfo = await Purchases.restorePurchases();
    const active = !!customerInfo.entitlements.active["premium"];
    setState({ isPremium: active });
    if (user?.uid) invalidateUserCache(user.uid);
    return active;
  }, [user?.uid]);

  const annualPackage = snapshot.packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPackage = snapshot.packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);

  return {
    isPremium: snapshot.isPremium,
    loading: snapshot.loading,
    annualPackage,
    monthlyPackage,
    purchasePlan,
    restorePurchases,
  };
}
