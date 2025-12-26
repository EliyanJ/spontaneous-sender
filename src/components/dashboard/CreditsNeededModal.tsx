import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreditCard, Zap, ArrowRight, Coins } from "lucide-react";

interface CreditsNeededModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType?: string;
  creditsAvailable?: number;
}

export const CreditsNeededModal = ({ 
  isOpen, 
  onClose, 
  planType = "free",
  creditsAvailable = 0 
}: CreditsNeededModalProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = () => {
    setIsLoading(true);
    navigate("/pricing");
    onClose();
  };

  const isPremium = planType === "plus";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Crédits insuffisants
          </DialogTitle>
          <DialogDescription className="text-center">
            Vous n'avez plus assez de crédits pour effectuer cette recherche.
            {creditsAvailable > 0 && (
              <span className="block mt-1 text-muted-foreground">
                Crédits restants : <span className="font-medium text-foreground">{creditsAvailable}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {!isPremium && (
            <Button 
              onClick={handleUpgrade} 
              className="w-full gap-2"
              disabled={isLoading}
            >
              <Zap className="h-4 w-4" />
              Passer à un plan supérieur
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          )}

          <Button 
            onClick={handleUpgrade} 
            variant={isPremium ? "default" : "outline"}
            className="w-full gap-2"
            disabled={isLoading}
          >
            <CreditCard className="h-4 w-4" />
            Acheter des tokens supplémentaires
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>

          <Button 
            onClick={onClose} 
            variant="ghost"
            className="w-full"
          >
            Plus tard
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            <strong>1 crédit = 1 email trouvé</strong>
            <br />
            Les crédits sont débités uniquement pour les emails valides découverts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
