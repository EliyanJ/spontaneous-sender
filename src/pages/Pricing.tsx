import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Crown, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PRODUCTS, FREE_PLAN, PriceType } from "@/lib/stripe-config";

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan_type")
          .eq("user_id", user.id)
          .single();
        
        if (subscription) {
          setCurrentPlan(subscription.plan_type);
        }
      }
    };
    
    checkAuth();
  }, []);

  const handleCheckout = async (priceType: PriceType) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour souscrire à un plan",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    setLoading(priceType);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading("manage");

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ouvrir le portail client",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          
          {currentPlan !== "free" && (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loading === "manage"}
            >
              {loading === "manage" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Gérer mon abonnement
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Tarification simple et transparente
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Boostez votre recherche d'emploi avec des envois automatisés et personnalisés
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Plan */}
          <Card className={`relative ${currentPlan === "free" ? "border-primary" : ""}`}>
            {currentPlan === "free" && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Plan actuel
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {FREE_PLAN.name}
              </CardTitle>
              <CardDescription>Pour découvrir la plateforme</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{FREE_PLAN.price}€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FREE_PLAN.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                disabled={true}
              >
                {currentPlan === "free" ? "Plan actuel" : "Gratuit"}
              </Button>
            </CardFooter>
          </Card>

          {/* Simple Plan */}
          <Card className={`relative border-2 ${currentPlan === "simple" ? "border-primary" : "border-primary/50"}`}>
            {currentPlan === "simple" ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Plan actuel
              </Badge>
            ) : (
              <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                Populaire
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                {STRIPE_PRODUCTS.PLAN_SIMPLE.name}
              </CardTitle>
              <CardDescription>Pour les chercheurs actifs</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{STRIPE_PRODUCTS.PLAN_SIMPLE.price}€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {STRIPE_PRODUCTS.PLAN_SIMPLE.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={currentPlan === "simple" || loading === "PLAN_SIMPLE"}
                onClick={() => handleCheckout("PLAN_SIMPLE")}
              >
                {loading === "PLAN_SIMPLE" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {currentPlan === "simple" ? "Plan actuel" : "Souscrire"}
              </Button>
            </CardFooter>
          </Card>

          {/* Plus Plan */}
          <Card className={`relative ${currentPlan === "plus" ? "border-primary" : ""}`}>
            {currentPlan === "plus" && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Plan actuel
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {STRIPE_PRODUCTS.PLAN_PLUS.name}
              </CardTitle>
              <CardDescription>Pour maximiser vos chances</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{STRIPE_PRODUCTS.PLAN_PLUS.price}€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {STRIPE_PRODUCTS.PLAN_PLUS.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={currentPlan === "plus" ? "outline" : "default"}
                disabled={currentPlan === "plus" || loading === "PLAN_PLUS"}
                onClick={() => handleCheckout("PLAN_PLUS")}
              >
                {loading === "PLAN_PLUS" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {currentPlan === "plus" ? "Plan actuel" : "Souscrire"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Token Packs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Besoin de crédits supplémentaires ?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{STRIPE_PRODUCTS.PACK_50_TOKENS.name}</span>
                  <Badge variant="outline">{STRIPE_PRODUCTS.PACK_50_TOKENS.price}€</Badge>
                </CardTitle>
                <CardDescription>
                  {STRIPE_PRODUCTS.PACK_50_TOKENS.tokens} crédits d'envoi supplémentaires
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading === "PACK_50_TOKENS"}
                  onClick={() => handleCheckout("PACK_50_TOKENS")}
                >
                  {loading === "PACK_50_TOKENS" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Acheter
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{STRIPE_PRODUCTS.PACK_100_TOKENS.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">-10%</Badge>
                    <Badge variant="outline">{STRIPE_PRODUCTS.PACK_100_TOKENS.price}€</Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  {STRIPE_PRODUCTS.PACK_100_TOKENS.tokens} crédits d'envoi supplémentaires
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={loading === "PACK_100_TOKENS"}
                  onClick={() => handleCheckout("PACK_100_TOKENS")}
                >
                  {loading === "PACK_100_TOKENS" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Acheter
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
