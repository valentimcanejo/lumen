import { useState, useEffect, useCallback } from "react";
import Purchases, { PACKAGE_TYPE, PurchasesPackage } from "react-native-purchases";
import { useAuth } from "./useAuth";
import { invalidateUserCache } from "./useUser";

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function init() {
      try {
        const [{ customerInfo }, offerings] = await Promise.all([
          Purchases.logIn(user!.uid),
          Purchases.getOfferings(),
        ]);

        if (cancelled) return;

        setIsPremium(!!customerInfo.entitlements.active["premium"]);
        setPackages(offerings.current?.availablePackages ?? []);
      } catch {
        // RevenueCat unavailable (Expo Go) or network error — fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const purchasePlan = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active["premium"];
      setIsPremium(active);
      if (user?.uid) invalidateUserCache(user.uid);
      return active;
    } catch (e: unknown) {
      if (e && typeof e === "object" && "userCancelled" in e && e.userCancelled) {
        return false;
      }
      throw e;
    }
  }, [user?.uid]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const customerInfo = await Purchases.restorePurchases();
    const active = !!customerInfo.entitlements.active["premium"];
    setIsPremium(active);
    if (user?.uid) invalidateUserCache(user.uid);
    return active;
  }, [user?.uid]);

  const annualPackage = packages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const monthlyPackage = packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);

  return { isPremium, loading, annualPackage, monthlyPackage, purchasePlan, restorePurchases };
}
