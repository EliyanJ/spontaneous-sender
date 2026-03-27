import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Mail, Building2, Loader2, Send, ArrowRight, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BatchResultsSummaryProps {
  batchId: string;
  totalCompanies: number;
  onGoToEmails: () => void;
  onNewSearch: () => void;
}

interface CompanyResult {
  id: string;
  nom: string;
  selected_email: string | null;
  email_source: string | null;
  website_url: string | null;
}

export const BatchResultsSummary = ({
  batchId,
  totalCompanies,
  onGoToEmails,
  onNewSearch,
}: BatchResultsSummaryProps) => {
  const [phase, setPhase] = useState<"searching" | "done">("searching");
  const [processed, setProcessed] = useState(0);
  const [emailsFound, setEmailsFound] = useState(0);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortRef = useRef(false);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === "searching") {
      interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Trigger email search for the batch
  useEffect(() => {
    abortRef.current = false;
    searchEmails();
    return () => { abortRef.current = true; };
  }, [batchId]);

  const searchEmails = async () => {
    setPhase("searching");
    setProcessed(0);
    setEmailsFound(0);

    let hasMore = true;
    let totalProcessed = 0;
    let totalFound = 0;

    while (hasMore && !abortRef.current) {
      try {
        const { data, error } = await supabase.functions.invoke('find-company-emails', {
          body: {
            maxCompanies: 10,
            batchIds: [batchId],
          }
        });

        if (error) {
          console.error('Email search error:', error);
          break;
        }

        if (data?.creditsNeeded === true) {
          break;
        }

        totalProcessed += data.processed || 0;
        totalFound += data.summary?.found || data.results?.filter((r: any) => r.emails && r.emails.length > 0).length || 0;
        hasMore = data.hasMore === true;

        setProcessed(totalProcessed);
        setEmailsFound(totalFound);

        if (hasMore) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.error('Email search error:', err);
        break;
      }
    }

    // Fetch final state from DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: finalCompanies } = await supabase
        .from('companies')
        .select('id, nom, selected_email, email_source, website_url')
        .eq('user_id', user.id)
        .eq('search_batch_id', batchId);

      if (finalCompanies) {
        setCompanies(finalCompanies);
        setEmailsFound(finalCompanies.filter(c => c.selected_email).length);
        setProcessed(finalCompanies.length);
      }
    }

    setPhase("done");
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}min ${sec}s` : `${sec}s`;
  };

  const progressPct = totalCompanies > 0 ? Math.min(100, (processed / totalCompanies) * 100) : 0;
  const successRate = processed > 0 ? Math.round((emailsFound / processed) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        {phase === "searching" ? (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-primary">Recherche d'emails en cours…</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Analyse de {totalCompanies} entreprise(s) · {formatTime(elapsedTime)}
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">Recherche terminée</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {processed} entreprise(s) analysées en {formatTime(elapsedTime)}
            </p>
          </>
        )}
      </div>

      {/* Progress */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-4">
          <Progress value={progressPct} className="h-2" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{totalCompanies}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Building2 className="h-3 w-3" /> Entreprises
              </div>
            </div>
            <div>
              <div className={cn(
                "text-2xl font-bold",
                emailsFound > 0 ? "text-emerald-500" : "text-muted-foreground"
              )}>
                {emailsFound}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" /> Emails trouvés
              </div>
            </div>
            <div>
              <div className={cn(
                "text-2xl font-bold",
                successRate >= 60 ? "text-emerald-500" : successRate >= 30 ? "text-amber-500" : "text-red-500"
              )}>
                {phase === "searching" ? "…" : `${successRate}%`}
              </div>
              <div className="text-xs text-muted-foreground">Taux de succès</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company results list (only when done) */}
      {phase === "done" && companies.length > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {companies.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                >
                  <span className="text-sm font-medium text-foreground truncate flex-1">{c.nom}</span>
                  {c.selected_email ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      {c.selected_email}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pas d'email
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {phase === "done" && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {emailsFound > 0 && (
            <Button onClick={onGoToEmails} size="lg" className="gap-2">
              <Send className="h-4 w-4" />
              Envoyer des candidatures ({emailsFound} emails)
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={onNewSearch} variant="outline" size="lg" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Nouvelle recherche
          </Button>
        </div>
      )}
    </div>
  );
};
