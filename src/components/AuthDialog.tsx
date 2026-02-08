import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      setEmail("");
      setPassword("");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Connexion réussie !");
      onOpenChange(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        console.error('OAuth error:', result.error);
        toast.error(result.error.message || "Erreur lors de la connexion Google");
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast.error(error?.message || "Erreur lors de la connexion Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bienvenue</DialogTitle>
          <DialogDescription>
            Connectez-vous ou créez un compte pour commencer votre prospection
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full"
            variant="outline"
            size="lg"
          >
            {googleLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-5 w-5" />
                Continuer avec Google (Gmail)
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continuer avec email
              </span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/forgot-password");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <div className="space-y-4 py-4 text-center">
              <p className="text-muted-foreground">
                Créez un compte complet avec toutes vos informations
              </p>
              <Button 
                className="w-full" 
                onClick={() => {
                  onOpenChange(false);
                  navigate("/register");
                }}
              >
                Créer un compte
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
