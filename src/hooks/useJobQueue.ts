import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  results: any[];
  errors: any[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface UseJobQueueReturn {
  currentJob: JobProgress | null;
  isLoading: boolean;
  createJob: (companies: any[], searchParams: any) => Promise<string | null>;
  subscribeToJob: (jobId: string) => void;
  unsubscribe: () => void;
}

export function useJobQueue(onJobComplete?: (job: JobProgress) => void): UseJobQueueReturn {
  const [currentJob, setCurrentJob] = useState<JobProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  // Transform DB row to JobProgress
  const transformJob = (row: any): JobProgress => ({
    id: row.id,
    status: row.status,
    totalCount: row.total_count,
    processedCount: row.processed_count,
    successCount: row.success_count,
    errorCount: row.error_count,
    skippedCount: row.skipped_count,
    results: row.results || [],
    errors: row.errors || [],
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  });

  // Create a new job in the queue
  const createJob = useCallback(async (companies: any[], searchParams: any): Promise<string | null> => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tu dois être connecté');
        return null;
      }

      const companySirens = companies.map(c => c.siren);

      const { data, error } = await supabase
        .from('job_queue')
        .insert({
          user_id: user.id,
          status: 'pending',
          priority: 100,
          is_premium: false, // TODO: Check user subscription
          search_params: { companies, ...searchParams },
          company_sirens: companySirens,
          total_count: companies.length,
          processed_count: 0,
          success_count: 0,
          error_count: 0,
          skipped_count: 0,
          results: [],
          errors: [],
        })
        .select()
        .single();

      if (error) throw error;

      const job = transformJob(data);
      setCurrentJob(job);
      toast.success(`Recherche de ${companies.length} entreprises ajoutée à la queue`);
      
      return data.id;
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast.error('Erreur lors de la création du job');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to job updates via Supabase Realtime
  const subscribeToJob = useCallback((jobId: string) => {
    // Unsubscribe from previous channel if exists
    if (channel) {
      supabase.removeChannel(channel);
    }

    console.log(`[useJobQueue] Subscribing to job ${jobId}`);

    const newChannel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_queue',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[useJobQueue] Job update:', payload.new);
          const job = transformJob(payload.new);
          setCurrentJob(job);

          // Check if job is completed
          if (job.status === 'completed') {
            toast.success(`Recherche terminée : ${job.successCount} entreprises traitées`);
            onJobComplete?.(job);
          } else if (job.status === 'failed') {
            toast.error('La recherche a échoué');
          }
        }
      )
      .subscribe();

    setChannel(newChannel);

    // Also fetch current state
    supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentJob(transformJob(data));
        }
      });
  }, [channel, onJobComplete]);

  // Unsubscribe from realtime updates
  const unsubscribe = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
    }
    setCurrentJob(null);
  }, [channel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  return {
    currentJob,
    isLoading,
    createJob,
    subscribeToJob,
    unsubscribe,
  };
}
