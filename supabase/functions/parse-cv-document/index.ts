import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from DOCX (which is a zip file with XML)
async function parseDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(arrayBuffer);
    
    // The main document content is in word/document.xml
    const documentXml = await contents.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      throw new Error("Could not find document.xml in DOCX");
    }

    // Extract text from XML, removing tags
    let text = documentXml
      // Replace paragraph ends with newlines
      .replace(/<\/w:p>/g, '\n')
      // Replace tabs
      .replace(/<w:tab\/>/g, '\t')
      // Remove all XML tags
      .replace(/<[^>]+>/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up multiple newlines
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return text;
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX file");
  }
}

// Parse PDF using Lovable AI for text extraction
async function parsePdfWithAI(base64Data: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract ALL text content from this CV/resume document. Return ONLY the extracted text, formatted cleanly with proper sections. Include:
- Personal information (name, contact)
- Professional summary
- Work experience (company, role, dates, responsibilities)
- Education
- Skills
- Languages
- Any other relevant sections

Do not add any commentary, just extract the text content faithfully.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI parsing failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error("Error parsing PDF with AI:", error);
    throw new Error("Failed to parse PDF file");
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileBase64, fileName, fileType } = await req.json();

    if (!fileBase64 || !fileName) {
      throw new Error('Missing file data');
    }

    console.log(`Parsing CV: ${fileName} (${fileType})`);

    let extractedText = '';

    // Decode base64 to ArrayBuffer
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      // Parse DOCX
      extractedText = await parseDocx(arrayBuffer);
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Parse PDF using AI
      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }
      extractedText = await parsePdfWithAI(fileBase64, apiKey);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // Plain text
      extractedText = new TextDecoder().decode(bytes);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log(`Extracted ${extractedText.length} characters from ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      text: extractedText,
      fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in parse-cv-document:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
