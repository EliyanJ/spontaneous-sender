import { ReactNode } from "react";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PlanFeatures } from "@/lib/plan-features";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Sparkles } from "lucide-react";

type FeatureKey = keyof PlanFeatures;

// Features globally disabled (coming soon) regardless of plan
const COMING_SOON_FEATURES: FeatureKey[] = [
  'canGenerateAIEmails',
  'canGenerateCoverLetters',
  'canGenerateAISubjects',
];

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
  upgradeTitle?: string;
  upgradeDescription?: string;
  bannerVariant?: "default" | "compact" | "inline";
}

const ComingSoonBanner = () => (
  <div className="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
      <Clock className="h-4 w-4" />
    </div>
    <div>
      <p className="font-medium text-foreground/70 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        Bientôt disponible
      </p>
      <p className="text-xs mt-0.5">Cette fonctionnalité IA est en cours de refonte et sera disponible prochainement.</p>
    </div>
  </div>
);

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

  // Check if globally disabled (coming soon)
  if (COMING_SOON_FEATURES.includes(feature)) {
    if (!showFallback) return null;
    return fallback ? <>{fallback}</> : <ComingSoonBanner />;
  }

  const featureValue = features[feature];
  
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
