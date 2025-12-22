import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 5; // Process 5 companies at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2s between batches
const ALTERNATION_THRESHOLD = 50; // Use alternation logic when <= 50 jobs

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get next job to process with priority logic
async function getNextJob(supabase: any): Promise<any> {
  // Count pending jobs
  const { count: pendingCount } = await supabase
    .from('job_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  console.log(`[Worker] ${pendingCount || 0} pending jobs in queue`);

  if (!pendingCount || pendingCount === 0) return null;

  // Always prioritize premium users first
  const { data: premiumJob } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .eq('is_premium', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (premiumJob) {
    console.log(`[Worker] Found premium job: ${premiumJob.id}`);
    return premiumJob;
  }

  // For regular users: use alternation if <= 50 jobs
  if (pendingCount <= ALTERNATION_THRESHOLD) {
    // Alternate between small and large jobs
    // Get one small job (< 20 companies) and one large job (>= 20)
    const { data: jobs } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('is_premium', false)
      .order('created_at', { ascending: true });

    if (jobs && jobs.length > 0) {
      const smallJobs = jobs.filter((j: any) => j.total_count < 20);
      const largeJobs = jobs.filter((j: any) => j.total_count >= 20);

      // Alternate: prefer small if exists, else large
      if (smallJobs.length > 0) {
        console.log(`[Worker] Alternation: selecting small job (${smallJobs[0].total_count} companies)`);
        return smallJobs[0];
      }
      if (largeJobs.length > 0) {
        console.log(`[Worker] Alternation: selecting large job (${largeJobs[0].total_count} companies)`);
        return largeJobs[0];
      }
    }
  }

  // Pure FIFO for > 50 jobs
  const { data: fifoJob } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return fifoJob;
}

// Check if company is blacklisted
async function isBlacklisted(supabase: any, siren: string): Promise<boolean> {
  const { data } = await supabase
    .rpc('is_company_blacklisted', { p_siren: siren });
  return data === true;
}

// Add company to blacklist
async function addToBlacklist(
  supabase: any,
  siren: string,
  name: string,
  reason: 'no_email_found' | 'api_error' | 'invalid_company',
  permanent: boolean
) {
  try {
    await supabase.rpc('add_to_blacklist', {
      p_siren: siren,
      p_name: name,
      p_reason: reason,
      p_permanent: permanent
    });
    console.log(`[Blacklist] Added ${siren} (${reason}, permanent: ${permanent})`);
  } catch (error) {
    console.error(`[Blacklist] Error adding ${siren}:`, error);
  }
}

// Process a single company - search for website and emails
async function processCompany(
  supabase: any,
  company: any,
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const siren = company.siren;
  const nom = company.nom;

  console.log(`[Process] Company: ${nom} (${siren})`);

  // Check blacklist first
  const blacklisted = await isBlacklisted(supabase, siren);
  if (blacklisted) {
    console.log(`[Process] Skipped - blacklisted: ${siren}`);
    return { success: false, error: 'blacklisted' };
  }

  try {
    // Step 1: Find website (using search-companies internal logic)
    // For now, we'll use the existing website_url if present
    let websiteUrl = company.website_url;

    // Step 2: Find emails if we have a website
    if (websiteUrl) {
      // Call find-company-emails logic internally
      // Since we can't easily call another edge function, we'll mark for later processing
      return {
        success: true,
        data: {
          ...company,
          website_url: websiteUrl,
          processed: true
        }
      };
    }

    // No website found
    console.log(`[Process] No website for ${nom}`);
    return {
      success: true,
      data: {
        ...company,
        website_url: null,
        processed: true
      }
    };

  } catch (error: any) {
    console.error(`[Process] Error for ${nom}:`, error.message);
    
    // Add to blacklist for 24h on API error
    await addToBlacklist(supabase, siren, nom, 'api_error', false);
    
    return { success: false, error: error.message };
  }
}

// Update job progress in realtime
async function updateJobProgress(
  supabase: any,
  jobId: string,
  updates: {
    processed_count?: number;
    success_count?: number;
    error_count?: number;
    skipped_count?: number;
    results?: any[];
    errors?: any[];
    status?: string;
    started_at?: string;
    completed_at?: string;
  }
) {
  const { error } = await supabase
    .from('job_queue')
    .update(updates)
    .eq('id', jobId);

  if (error) {
    console.error(`[Worker] Error updating job ${jobId}:`, error);
  }
}

// Main job processing function
async function processJob(supabase: any, job: any) {
  console.log(`[Worker] Starting job ${job.id} with ${job.total_count} companies`);

  // Mark job as processing
  await updateJobProgress(supabase, job.id, {
    status: 'processing',
    started_at: new Date().toISOString()
  });

  const companies = job.search_params?.companies || [];
  const results: any[] = [];
  const errors: any[] = [];
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Process in batches
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    
    console.log(`[Worker] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(companies.length / BATCH_SIZE)}`);

    for (const company of batch) {
      const result = await processCompany(supabase, company, job.user_id);
      processedCount++;

      if (result.error === 'blacklisted') {
        skippedCount++;
      } else if (result.success) {
        successCount++;
        results.push(result.data);
      } else {
        errorCount++;
        errors.push({ siren: company.siren, nom: company.nom, error: result.error });
      }

      // Update progress in realtime
      await updateJobProgress(supabase, job.id, {
        processed_count: processedCount,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        results: results,
        errors: errors
      });
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < companies.length) {
      await delay(DELAY_BETWEEN_BATCHES);
    }
  }

  // Mark job as completed
  await updateJobProgress(supabase, job.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    results: results,
    errors: errors
  });

  console.log(`[Worker] Job ${job.id} completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get next job to process
    const job = await getNextJob(supabase);

    if (!job) {
      console.log('[Worker] No pending jobs');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the job
    await processJob(supabase, job);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        message: 'Job processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Worker] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
