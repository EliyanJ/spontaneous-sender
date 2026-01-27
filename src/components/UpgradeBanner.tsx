import { Crown, Sparkles, Search, FileText, Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeBannerProps {
  title?: string;
  description?: string;
  features?: string[];
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export const UpgradeBanner = ({
  title = "Fonctionnalité Premium",
  description = "Passez au plan Plus pour débloquer toutes les fonctionnalités",
  features = [
    "Recherche IA et manuelle précise",
    "Emails personnalisés par l'IA",
    "Lettres de motivation générées",
    "Accès aux offres d'emploi"
  ],
  variant = "default",
  className = ""
}: UpgradeBannerProps) => {
  const navigate = useNavigate();

  if (variant === "inline") {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 ${className}`}>
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button size="sm" onClick={() => navigate("/pricing")} className="gap-1">
          Upgrade
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Card className={`border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{description}</p>
              <Button size="sm" onClick={() => navigate("/pricing")} className="gap-1">
                Voir les plans
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 ${className}`}>
      <CardContent className="p-6 sm:p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/20 mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-left">
            {features.map((feature, index) => {
              const icons = [Sparkles, Search, FileText, Briefcase];
              const Icon = icons[index % icons.length];
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => navigate("/pricing")} className="gap-2">
              <Crown className="h-4 w-4" />
              Voir les plans
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
