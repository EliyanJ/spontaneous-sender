import { ReactNode } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanFeatures } from "@/lib/plan-features";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { Skeleton } from "@/components/ui/skeleton";

type FeatureKey = keyof PlanFeatures;

interface FeatureGateProps {
  /** The feature key to check (e.g., 'canGenerateAIEmails') */
  feature: FeatureKey;
  /** Content to render when the feature is allowed */
  children: ReactNode;
  /** Content to render when the feature is not allowed (defaults to UpgradeBanner) */
  fallback?: ReactNode;
  /** Whether to show the fallback or just hide content */
  showFallback?: boolean;
  /** Custom title for the upgrade banner */
  upgradeTitle?: string;
  /** Custom description for the upgrade banner */
  upgradeDescription?: string;
  /** Banner variant */
  bannerVariant?: "default" | "compact" | "inline";
}

export const FeatureGate = ({
  feature,
  children,
  fallback,
  showFallback = true,
  upgradeTitle,
  upgradeDescription,
  bannerVariant = "compact"
}: FeatureGateProps) => {
  const { features, isLoading } = usePlanFeatures();

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  const featureValue = features[feature];
  
  // For boolean features
  if (typeof featureValue === 'boolean') {
    if (featureValue) {
      return <>{children}</>;
    }
    
    if (!showFallback) {
      return null;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <UpgradeBanner 
        title={upgradeTitle}
        description={upgradeDescription}
        variant={bannerVariant}
      />
    );
  }

  // For non-boolean features (like maxCompaniesPerSearch), always show children
  // The component using this gate should handle the limit internally
  return <>{children}</>;
};

// Utility component to conditionally render based on premium status
interface PremiumOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
}

export const PremiumOnly = ({ children, fallback, showFallback = true }: PremiumOnlyProps) => {
  const { isPremium, isLoading } = usePlanFeatures();

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradeBanner variant="compact" />;
};
