import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanFeatures, PlanFeatures, PlanType, isPremiumPlan } from "@/lib/plan-features";

interface UsePlanFeaturesResult {
  features: PlanFeatures;
  planType: PlanType;
  isLoading: boolean;
  isPremium: boolean;
  refetch: () => Promise<void>;
}

export const usePlanFeatures = (): UsePlanFeaturesResult => {
  const [planType, setPlanType] = useState<PlanType>("free");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlanType = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPlanType("free");
        return;
      }

      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("plan_type")
        .eq("user_id", user.id)
        .single();

      if (error || !subscription) {
        setPlanType("free");
        return;
      }

      // Validate the plan_type from DB matches our expected types
      const dbPlanType = subscription.plan_type as string;
      if (dbPlanType === "free" || dbPlanType === "simple" || dbPlanType === "plus") {
        setPlanType(dbPlanType as PlanType);
      } else {
        setPlanType("free");
      }
    } catch (error) {
      console.error("Error fetching plan type:", error);
      setPlanType("free");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanType();

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPlanType();
    });

    // Listen for realtime subscription changes
    const channel = supabase
      .channel('plan-features-subscription')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          fetchPlanType();
        }
      )
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    features: getPlanFeatures(planType),
    planType,
    isLoading,
    isPremium: isPremiumPlan(planType),
    refetch: fetchPlanType,
  };
};
