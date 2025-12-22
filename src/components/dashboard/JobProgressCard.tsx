import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, Ban, Loader2 } from 'lucide-react';

interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  createdAt: string;
  startedAt: string | null;
}

interface JobProgressCardProps {
  job: JobProgress;
  onViewResults?: () => void;
}

export const JobProgressCard = ({ job, onViewResults }: JobProgressCardProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (job.status === 'pending' || job.status === 'processing') {
      const startTime = job.startedAt ? new Date(job.startedAt).getTime() : new Date(job.createdAt).getTime();
      
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [job.status, job.startedAt, job.createdAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = job.totalCount > 0 
    ? Math.round((job.processedCount / job.totalCount) * 100) 
    : 0;

  const estimatedRemaining = job.processedCount > 0
    ? Math.round(((job.totalCount - job.processedCount) / job.processedCount) * elapsedTime)
    : null;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-muted-foreground animate-pulse" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'En attente dans la queue...';
      case 'processing':
        return 'Recherche en cours...';
      case 'completed':
        return 'Recherche terminée';
      case 'failed':
        return 'Recherche échouée';
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between mt-1 text-sm text-muted-foreground">
            <span>{progress}%</span>
            <span>{job.processedCount} / {job.totalCount}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="flex items-center justify-center gap-1.5 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span className="font-semibold">{job.successCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Trouvées</span>
          </div>

          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">{job.totalCount - job.processedCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">En attente</span>
          </div>

          <div className="text-center p-2 rounded-lg bg-destructive/10">
            <div className="flex items-center justify-center gap-1.5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold">{job.errorCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Erreurs</span>
          </div>

          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <div className="flex items-center justify-center gap-1.5 text-amber-500">
              <Ban className="h-4 w-4" />
              <span className="font-semibold">{job.skippedCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Blacklistées</span>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Temps écoulé : {formatTime(elapsedTime)}</span>
          </div>
          {estimatedRemaining !== null && job.status === 'processing' && (
            <span>~{formatTime(estimatedRemaining)} restant</span>
          )}
        </div>

        {/* View Results Button (only when completed) */}
        {job.status === 'completed' && onViewResults && (
          <button
            onClick={onViewResults}
            className="w-full mt-4 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Voir les résultats ({job.successCount} entreprises)
          </button>
        )}
      </CardContent>
    </Card>
  );
};
