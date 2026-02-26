import React, { useState } from "react";
import { Cookie, Settings, X, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const CookieBanner = () => {
  const { hasConsented, analyticsEnabled, preferencesEnabled, acceptAll, rejectAll, updateConsent } = useCookieConsent();
  const { user } = useAuth();
  const [showCustomize, setShowCustomize] = useState(false);
  const [localAnalytics, setLocalAnalytics] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(false);
  const [saving, setSaving] = useState(false);

  if (hasConsented) return null;

  const handleAcceptAll = async () => {
    setSaving(true);
    await acceptAll(user?.id);
    setSaving(false);
  };

  const handleRejectAll = async () => {
    setSaving(true);
    await rejectAll(user?.id);
    setSaving(false);
  };

  const handleSaveCustom = async () => {
    setSaving(true);
    await updateConsent(localAnalytics, localPreferences, user?.id);
    setSaving(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {!showCustomize ? (
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base">
                  Nous respectons votre vie privée 🛡️
                </h3>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                  Nous utilisons des cookies essentiels pour faire fonctionner le site. Avec votre accord, nous collectons aussi des données analytiques anonymes (pages visitées, durée de session) pour améliorer votre expérience. Aucune donnée n'est partagée avec des tiers.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5 items-center justify-between">
              <button
                onClick={() => setShowCustomize(true)}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors flex items-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                Personnaliser
              </button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={saving}
                  className="text-muted-foreground"
                >
                  Essentiels uniquement
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  disabled={saving}
                  className="gap-2"
                >
                  <Check className="h-3.5 w-3.5" />
                  Tout accepter
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Personnaliser mes préférences
              </h3>
              <button
                onClick={() => setShowCustomize(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Essentiels — toujours actifs */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-sm text-foreground">Cookies essentiels</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Toujours actifs</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Authentification, session utilisateur, sécurité. Indispensables au fonctionnement du site.
                  </p>
                </div>
                <Switch checked={true} disabled className="mt-0.5" />
              </div>

              {/* Analytiques */}
              <div className={cn(
                "flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors",
                localAnalytics ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}>
                <div className="flex-1">
                  <span className="font-medium text-sm text-foreground">Cookies analytiques</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pages visitées, durée de session, fonctionnalités utilisées. Données anonymisées, stockées dans notre base — jamais partagées.
                  </p>
                </div>
                <Switch
                  checked={localAnalytics}
                  onCheckedChange={setLocalAnalytics}
                  className="mt-0.5"
                />
              </div>

              {/* Préférences */}
              <div className={cn(
                "flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors",
                localPreferences ? "border-primary/30 bg-primary/5" : "border-border bg-card"
              )}>
                <div className="flex-1">
                  <span className="font-medium text-sm text-foreground">Cookies de préférences</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Thème (clair/sombre), dernier onglet visité, filtres de recherche enregistrés.
                  </p>
                </div>
                <Switch
                  checked={localPreferences}
                  onCheckedChange={setLocalPreferences}
                  className="mt-0.5"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5 justify-end">
              <Button variant="outline" size="sm" onClick={handleRejectAll} disabled={saving}>
                Tout refuser
              </Button>
              <Button size="sm" onClick={handleSaveCustom} disabled={saving} className="gap-2">
                <Check className="h-3.5 w-3.5" />
                Sauvegarder mes choix
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
