import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Sparkles } from "lucide-react";

interface ProcessLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'processing';
  message: string;
  company?: string;
}

interface GenerationOverlayProps {
  isOpen: boolean;
  progress: number;
  elapsedTime: number;
  currentStep: string;
  processLogs: ProcessLog[];
  totalItems: number;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const GenerationOverlay = ({
  isOpen,
  progress,
  elapsedTime,
  currentStep,
  processLogs,
  totalItems
}: GenerationOverlayProps) => {
  if (!isOpen) return null;

  const estimatedRemaining = progress > 0 && progress < 100
    ? Math.round((elapsedTime / progress) * (100 - progress))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <Loader2 className="h-3 w-3 text-success-foreground animate-spin" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Génération en cours</h2>
                  <p className="text-sm text-muted-foreground">{currentStep || "Initialisation..."}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{progress}%</div>
                <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsedTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progression</span>
                <span className="text-muted-foreground">
                  {estimatedRemaining > 0 && `~${formatTime(estimatedRemaining)} restant`}
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">{totalItems}</div>
                <div className="text-xs text-muted-foreground">Entreprises</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10">
                <div className="text-2xl font-bold text-success">
                  {processLogs.filter(l => l.type === 'success').length}
                </div>
                <div className="text-xs text-muted-foreground">Réussies</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <div className="text-2xl font-bold text-destructive">
                  {processLogs.filter(l => l.type === 'error' && l.company).length}
                </div>
                <div className="text-xs text-muted-foreground">Erreurs</div>
              </div>
            </div>

            {/* Live Log */}
            <div className="bg-background/50 rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium text-foreground">Journal en temps réel</span>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="p-4 space-y-2 font-mono text-xs">
                  {processLogs.slice(-50).map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex items-start gap-2 py-1.5 px-3 rounded-lg transition-colors ${
                        log.type === 'error' ? 'bg-destructive/10 text-destructive' :
                        log.type === 'success' ? 'bg-success/10 text-success' :
                        log.type === 'processing' ? 'bg-primary/10 text-primary' :
                        'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <span className="text-muted-foreground/60 shrink-0 tabular-nums">
                        {log.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {log.company && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-normal">
                          {log.company}
                        </Badge>
                      )}
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  {processLogs.length === 0 && (
                    <div className="text-muted-foreground text-center py-8">
                      En attente du démarrage...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Tip */}
            <p className="text-xs text-muted-foreground text-center py-2">
              💡 L'IA analyse chaque site web pour créer des emails ultra-personnalisés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
