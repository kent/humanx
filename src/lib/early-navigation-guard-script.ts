import { installEarlyInAppNavigationGuard } from "@/lib/early-navigation-guard-runtime";

export const EARLY_IN_APP_NAVIGATION_GUARD_SCRIPT = `(${installEarlyInAppNavigationGuard.toString()})(window);`;
