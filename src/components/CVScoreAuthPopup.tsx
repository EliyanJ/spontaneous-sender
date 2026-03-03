import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Zap, Infinity, TrendingUp, Mail } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const CVScoreAuthPopup = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard?tab=cv-score` },
      });
      if (error) throw error;
      toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      toast.error(err.message || "Erreur Google");
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Top banner */}
        <div className="bg-gradient-to-br from-primary to-primary/70 px-6 py-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold text-lg">Débloquez l'accès illimité</span>
          </div>
          <p className="text-sm text-primary-foreground/85 leading-relaxed">
            Connectez-vous gratuitement à Cronos pour comparer vos CV à des fiches de postes <strong>à l'infini</strong> et générer des candidatures optimisées.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: Infinity, label: "Comparaisons illimitées" },
              { icon: TrendingUp, label: "Génération de CV optimisé" },
              { icon: Mail, label: "Envoi auto de candidatures" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-primary-foreground/10 rounded-lg p-2.5 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1 text-primary-foreground/80" />
                <p className="text-[10px] text-primary-foreground/80 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5">
          <Button
            variant="outline"
            className="w-full gap-2 mb-4 h-10"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continuer avec Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <Label htmlFor="popup-email" className="text-xs">Email</Label>
              <Input
                id="popup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="popup-password" className="text-xs">Mot de passe</Label>
              <Input
                id="popup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                minLength={8}
                className="h-9 mt-1"
              />
            </div>
            <Button type="submit" className="w-full h-9" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer mon compte gratuit"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Déjà un compte ?{" "}
            <button
              onClick={() => { onOpenChange(false); navigate("/login"); }}
              className="text-primary hover:underline"
            >
              Se connecter
            </button>
          </p>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-2">
            Gratuit · Sans carte bancaire · 5 analyses offertes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
