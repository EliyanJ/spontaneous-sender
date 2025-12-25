import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Crown, Coins, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubscriptionData {
  plan_type: string;
  sends_remaining: number;
  sends_limit: number;
  tokens_remaining: number;
}

export const CreditsDisplay = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();

    // Subscribe to realtime updates for subscriptions
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('subscription-credits')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Realtime] Subscription updated:', payload.new);
            const newData = payload.new as any;
            setSubscription({
              plan_type: newData.plan_type,
              sends_remaining: newData.sends_remaining,
              sends_limit: newData.sends_limit,
              tokens_remaining: newData.tokens_remaining,
            });
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | undefined;
    setupRealtimeSubscription().then(ch => { channel = ch; });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to get existing subscription
      let { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, sends_remaining, sends_limit, tokens_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

      // If no subscription exists, create a default one
      if (!data && !error) {
        const { data: newSub } = await supabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan_type: "free",
            status: "active",
            sends_remaining: 5,
            sends_limit: 5,
            tokens_remaining: 0,
          })
          .select("plan_type, sends_remaining, sends_limit, tokens_remaining")
          .single();
        
        data = newSub;
      }

      if (data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 animate-pulse">
        <div className="w-12 h-4 bg-muted rounded" />
        <div className="w-16 h-4 bg-muted rounded" />
      </div>
    );
  }

  if (!subscription) return null;

  const creditsPercent = Math.round((subscription.sends_remaining / subscription.sends_limit) * 100);
  const isLow = creditsPercent < 20;

  const getPlanIcon = () => {
    if (subscription.plan_type === "plus") return <Crown className="h-3.5 w-3.5 text-yellow-500" />;
    if (subscription.plan_type === "simple") return <Zap className="h-3.5 w-3.5 text-primary" />;
    return null;
  };

  const getPlanBadgeVariant = () => {
    if (subscription.plan_type === "plus") return "default" as const;
    if (subscription.plan_type === "simple") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            to="/pricing"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer border border-border/50"
          >
            {/* Plan Badge */}
            <Badge variant={getPlanBadgeVariant()} className="gap-1 text-xs capitalize">
              {getPlanIcon()}
              {subscription.plan_type}
            </Badge>

            {/* Credits */}
            <div className="flex items-center gap-1.5">
              <div className={`text-xs font-medium ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                {subscription.sends_remaining}/{subscription.sends_limit}
              </div>
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${creditsPercent}%` }}
                />
              </div>
            </div>

            {/* Bonus Tokens */}
            {subscription.tokens_remaining > 0 && (
              <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/30">
                <Coins className="h-3 w-3" />
                +{subscription.tokens_remaining}
              </Badge>
            )}

            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Plan {subscription.plan_type}</p>
            <div>
              <p className="text-muted-foreground">Crédits mensuels</p>
              <p className="font-medium">{subscription.sends_remaining} / {subscription.sends_limit} restants</p>
            </div>
            {subscription.tokens_remaining > 0 && (
              <div>
                <p className="text-muted-foreground">Tokens bonus</p>
                <p className="font-medium text-primary">{subscription.tokens_remaining} tokens</p>
              </div>
            )}
            {isLow && (
              <p className="text-destructive text-xs">⚠️ Crédits presque épuisés</p>
            )}
            <p className="text-xs text-muted-foreground">Cliquez pour gérer votre abonnement</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
