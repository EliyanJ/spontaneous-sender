import React, { useState } from "react";
import { Cookie, Settings, X, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const CookieBanner = () => {
  const { hasConsented, acceptAll, rejectAll, updateConsent } = useCookieConsent();
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        {!showCustomize ? (
          <div className="px-4 py-3 flex flex-wrap items-center gap-3">
            <Cookie className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground text-xs flex-1 min-w-[180px]">
              Nous utilisons des cookies essentiels et, avec votre accord, des données analytiques anonymes pour améliorer le site.{" "}
              <button
                onClick={() => setShowCustomize(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Personnaliser
              </button>
            </p>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleRejectAll} disabled={saving} className="text-xs h-7 px-2 text-muted-foreground">
                Refuser
              </Button>
              <Button size="sm" onClick={handleAcceptAll} disabled={saving} className="text-xs h-7 px-3 gap-1.5">
                <Check className="h-3 w-3" />
                Accepter
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-primary" />
                Personnaliser mes préférences
              </h3>
              <button onClick={() => setShowCustomize(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 px-3 py-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs font-medium text-foreground">Essentiels</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Toujours actifs</span>
                </div>
                <Switch checked={true} disabled />
              </div>

              <div className={cn(
                "flex items-center justify-between gap-4 px-3 py-2 rounded-lg border transition-colors",
                localAnalytics ? "border-primary/30 bg-primary/5" : "border-border"
              )}>
                <span className="text-xs font-medium text-foreground">Analytiques</span>
                <Switch checked={localAnalytics} onCheckedChange={setLocalAnalytics} />
              </div>

              <div className={cn(
                "flex items-center justify-between gap-4 px-3 py-2 rounded-lg border transition-colors",
                localPreferences ? "border-primary/30 bg-primary/5" : "border-border"
              )}>
                <span className="text-xs font-medium text-foreground">Préférences</span>
                <Switch checked={localPreferences} onCheckedChange={setLocalPreferences} />
              </div>
            </div>

            <div className="flex gap-2 mt-3 justify-end">
              <Button variant="outline" size="sm" onClick={handleRejectAll} disabled={saving} className="text-xs h-7 px-2">
                Tout refuser
              </Button>
              <Button size="sm" onClick={handleSaveCustom} disabled={saving} className="text-xs h-7 px-3 gap-1.5">
                <Check className="h-3 w-3" />
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
