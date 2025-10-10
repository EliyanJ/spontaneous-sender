import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ PHASE 1: RECHERCHE DU SITE WEB OFFICIEL ============

async function findOfficialWebsite(companyName: string): Promise<{ url: string; domain: string } | null> {
  const apiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
  const cx = Deno.env.get('GOOGLE_SEARCH_ENGINE_ID');
  
  if (!apiKey || !cx) {
    console.log('Missing Google Custom Search API credentials');
    return null;
  }

  const queries = [
    `${companyName} site officiel`,
    `${companyName} official website`,
    `${companyName} france`,
    `${companyName} entreprise`,
    `${companyName} company`
  ];

  const excludedDomains = [
    'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'wikipedia.org', 'pagesjaunes.fr', 'societe.com', 'kompass.com',
    'verif.com', 'infogreffe.fr'
  ];

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemUrl = item.link;
          const isExcluded = excludedDomains.some(domain => itemUrl.includes(domain));
          
          if (!isExcluded) {
            const domain = extractDomain(itemUrl);
            console.log(`Found official website for ${companyName}: ${itemUrl} (domain: ${domain})`);
            return { url: itemUrl, domain };
          }
        }
      }
      
      await delay(200); // Rate limiting
    } catch (error) {
      console.error(`Error searching with query "${query}":`, error);
    }
  }

  return null;
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    
    // Remove www.
    hostname = hostname.replace(/^www\./, '');
    
    return hostname;
  } catch {
    return '';
  }
}

// ============ PHASE 2: SCRAPING DES EMAILS ============

const FRENCH_PAGES = {
  contact: ['/contact', '/nous-contacter', '/contactez-nous', '/coordonnees', '/mentions-legales'],
  rh: ['/recrutement', '/carrieres', '/rejoignez-nous', '/jobs', '/emplois', '/rh', '/ressources-humaines', '/postuler'],
  equipe: ['/a-propos', '/apropos', '/qui-sommes-nous', '/notre-equipe', '/equipe', '/direction', '/management', '/leadership']
};

const ENGLISH_PAGES = {
  contact: ['/contact', '/contact-us', '/get-in-touch', '/support'],
  rh: ['/careers', '/jobs', '/recruitment', '/join-us', '/join', '/work-with-us', '/hr', '/opportunities', '/hiring'],
  equipe: ['/about', '/about-us', '/who-we-are', '/our-team', '/team', '/management', '/leadership', '/executive-team']
};

interface EmailData {
  email: string;
  type: 'contact_general' | 'rh' | 'direction' | 'autre';
  source: 'scraping' | 'hunter_io';
  page?: string;
  context?: string;
  poste?: string;
  nom?: string;
  confidence?: number;
}

async function scrapePagesForEmails(domain: string): Promise<EmailData[]> {
  const allEmails: EmailData[] = [];
  const seenEmails = new Set<string>();
  
  // Combine all pages to test
  const pagesToTest: Array<{ path: string; type: string }> = [];
  
  // French pages
  FRENCH_PAGES.contact.forEach(path => pagesToTest.push({ path, type: 'contact' }));
  FRENCH_PAGES.rh.forEach(path => pagesToTest.push({ path, type: 'rh' }));
  FRENCH_PAGES.equipe.forEach(path => pagesToTest.push({ path, type: 'equipe' }));
  
  // English pages
  ENGLISH_PAGES.contact.forEach(path => pagesToTest.push({ path, type: 'contact' }));
  ENGLISH_PAGES.rh.forEach(path => pagesToTest.push({ path, type: 'rh' }));
  ENGLISH_PAGES.equipe.forEach(path => pagesToTest.push({ path, type: 'equipe' }));
  
  // Homepage footer
  pagesToTest.push({ path: '/', type: 'footer' });

  console.log(`Starting to scrape ${pagesToTest.length} pages for ${domain}`);

  // Scrape pages in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < pagesToTest.length; i += BATCH_SIZE) {
    const batch = pagesToTest.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async ({ path, type }) => {
      try {
        const url = `https://${domain}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'LovableAI-ContactFinder/1.0 (+https://lovable.app/contact)'
          }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          return null;
        }
        
        const html = await response.text();
        const emails = extractEmailsFromHTML(html, domain, type, path);
        
        return emails;
      } catch (error) {
        // Silently fail for 404s and timeouts
        return null;
      }
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(emails => {
      if (emails) {
        emails.forEach(emailData => {
          if (!seenEmails.has(emailData.email)) {
            seenEmails.add(emailData.email);
            allEmails.push(emailData);
          }
        });
      }
    });
    
    await delay(1000); // Rate limiting between batches
  }

  console.log(`Scraping complete: found ${allEmails.length} unique emails`);
  return allEmails;
}

function extractEmailsFromHTML(html: string, domain: string, pageType: string, pagePath: string): EmailData[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails: EmailData[] = [];
  const matches = html.match(emailRegex) || [];
  
  const excludePatterns = ['noreply@', 'no-reply@', 'donotreply@', 'bounce@', 'mailer@', 'daemon@', 'postmaster@'];
  
  matches.forEach(email => {
    email = email.toLowerCase();
    
    // Filter out excluded patterns
    if (excludePatterns.some(pattern => email.startsWith(pattern))) {
      return;
    }
    
    // Verify domain matches (or is very close)
    const emailDomain = email.split('@')[1];
    if (!emailDomain.includes(domain.split('.')[0])) {
      return;
    }
    
    // Categorize email
    const type = categorizeEmail(email, pageType, html);
    
    emails.push({
      email,
      type,
      source: 'scraping',
      page: pagePath
    });
  });
  
  return emails;
}

function categorizeEmail(email: string, pageType: string, context: string): 'contact_general' | 'rh' | 'direction' | 'autre' {
  const emailLower = email.toLowerCase();
  
  // Contact general patterns
  const contactPatterns = ['contact@', 'info@', 'hello@', 'bonjour@', 'accueil@', 'support@', 'service@'];
  if (contactPatterns.some(p => emailLower.includes(p)) || pageType === 'contact' || pageType === 'footer') {
    return 'contact_general';
  }
  
  // RH patterns
  const rhPatterns = ['rh@', 'recrutement@', 'careers@', 'jobs@', 'recruitment@', 'hr@', 'emploi@', 'candidature@', 'talent@'];
  if (rhPatterns.some(p => emailLower.includes(p)) || pageType === 'rh') {
    return 'rh';
  }
  
  // Direction patterns
  const directionPatterns = ['direction@', 'ceo@', 'dg@', 'president@', 'pdg@', 'founder@', 'management@'];
  if (directionPatterns.some(p => emailLower.includes(p))) {
    return 'direction';
  }
  
  return 'autre';
}

// ============ PHASE 3: HUNTER.IO EN COMPLÉMENT ============

async function supplementWithHunterIO(domain: string, scrapedEmails: EmailData[]): Promise<EmailData[]> {
  // Only use Hunter.io if we have < 3 emails from scraping
  if (scrapedEmails.length >= 3) {
    console.log(`Sufficient emails found (${scrapedEmails.length}), skipping Hunter.io`);
    return [];
  }
  
  const apiKey = Deno.env.get('HUNTER_API_KEY');
  if (!apiKey) {
    console.log('Hunter.io API key not configured');
    return [];
  }
  
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=50`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data || !data.data.emails) {
      return [];
    }
    
    const hunterEmails: EmailData[] = [];
    
    data.data.emails.forEach((item: any) => {
      // Filter by confidence
      if (item.confidence < 50) return;
      
      // Accept all generic emails
      if (item.type === 'generic') {
        const type = categorizeEmail(item.value, '', '');
        hunterEmails.push({
          email: item.value,
          type,
          source: 'hunter_io',
          confidence: item.confidence
        });
        return;
      }
      
      // For personal emails, filter by position
      if (item.type === 'personal' && item.position) {
        const positionLower = item.position.toLowerCase();
        
        const directionKeywords = ['ceo', 'chief executive', 'president', 'président', 'pdg', 'founder', 'fondateur', 'managing director', 'directeur général', 'owner'];
        const rhKeywords = ['hr', 'human resources', 'ressources humaines', 'recruitment', 'recrutement', 'talent', 'recruiter', 'recruteur'];
        
        const isDirection = directionKeywords.some(kw => positionLower.includes(kw));
        const isRH = rhKeywords.some(kw => positionLower.includes(kw));
        
        if (isDirection || isRH) {
          hunterEmails.push({
            email: item.value,
            type: isDirection ? 'direction' : 'rh',
            source: 'hunter_io',
            poste: item.position,
            nom: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
            confidence: item.confidence
          });
        }
      }
    });
    
    console.log(`Hunter.io found ${hunterEmails.length} additional emails`);
    return hunterEmails;
  } catch (error) {
    console.error('Error calling Hunter.io:', error);
    return [];
  }
}

// ============ PHASE 4: CONSOLIDATION ============

function consolidateEmails(scrapedEmails: EmailData[], hunterEmails: EmailData[]): any {
  // Merge and deduplicate
  const emailMap = new Map<string, EmailData>();
  
  // Add scraped emails first (they have priority)
  scrapedEmails.forEach(email => {
    emailMap.set(email.email, email);
  });
  
  // Add Hunter.io emails if not already present
  hunterEmails.forEach(email => {
    if (!emailMap.has(email.email)) {
      emailMap.set(email.email, email);
    } else {
      // Merge metadata if email already exists
      const existing = emailMap.get(email.email)!;
      existing.poste = email.poste || existing.poste;
      existing.nom = email.nom || existing.nom;
      existing.confidence = email.confidence || existing.confidence;
      existing.source = 'scraping_et_hunter' as any;
    }
  });
  
  const allEmails = Array.from(emailMap.values());
  
  // Group by type
  const grouped = {
    contact_general: allEmails.filter(e => e.type === 'contact_general').slice(0, 5),
    rh: allEmails.filter(e => e.type === 'rh').slice(0, 5),
    direction: allEmails.filter(e => e.type === 'direction').slice(0, 3),
    autres: allEmails.filter(e => e.type === 'autre').slice(0, 3)
  };
  
  return {
    emails: {
      contact_general: grouped.contact_general.map(e => e.email),
      rh: grouped.rh.map(e => e.email),
      direction: grouped.direction.map(e => e.email),
      autres: grouped.autres.map(e => e.email)
    },
    details_emails: allEmails.map(e => ({
      email: e.email,
      type: e.type,
      source: e.source,
      page: e.page,
      poste: e.poste,
      nom: e.nom,
      confidence: e.confidence
    }))
  };
}

// ============ MAIN HANDLER ============

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Fetch companies without emails
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .is('website_url', null)
      .limit(10);

    if (fetchError) throw fetchError;
    if (!companies || companies.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No companies to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${companies.length} companies`);
    let processed = 0;
    let updated = 0;

    for (const company of companies) {
      try {
        console.log(`\n=== Processing: ${company.nom} ===`);
        
        // PHASE 1: Find website
        const websiteData = await findOfficialWebsite(company.nom);
        if (!websiteData) {
          console.log(`No website found for ${company.nom}`);
          continue;
        }
        
        // PHASE 2: Scrape emails
        const scrapedEmails = await scrapePagesForEmails(websiteData.domain);
        
        // PHASE 3: Hunter.io supplement
        const hunterEmails = await supplementWithHunterIO(websiteData.domain, scrapedEmails);
        
        // PHASE 4: Consolidate
        const result = consolidateEmails(scrapedEmails, hunterEmails);
        
        // Flatten all emails for storage
        const allEmailsList = [
          ...result.emails.contact_general,
          ...result.emails.rh,
          ...result.emails.direction,
          ...result.emails.autres
        ];
        
        if (allEmailsList.length > 0) {
          // Update company with website and emails
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              website_url: websiteData.url,
              emails: allEmailsList
            })
            .eq('id', company.id);

          if (updateError) {
            console.error(`Error updating ${company.nom}:`, updateError);
          } else {
            console.log(`✓ Stored ${allEmailsList.length} emails for ${company.nom}`);
            updated++;
          }
        } else {
          // Just store the website even if no emails found
          await supabase
            .from('companies')
            .update({ website_url: websiteData.url })
            .eq('id', company.id);
          
          console.log(`✓ Stored website for ${company.nom} (no emails found)`);
        }
        
        processed++;
        await delay(1000); // Rate limiting
        
      } catch (error) {
        console.error(`Error processing ${company.nom}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Email search completed',
        processed,
        updated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in find-company-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
