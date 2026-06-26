import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTHENTICATION & AUTHORIZATION
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const allowedRoles = ['sme', 'sme_expert', 'manager', 'admin'] as const;
    let hasAccess = false;
    for (const role of allowedRoles) {
      const { data } = await adminClient.rpc('has_role', { _user_id: authData.user.id, _role: role });
      if (data) { hasAccess = true; break; }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { moduleContent, targetFormat, formatPreferences } = await req.json();

    if (!moduleContent || !targetFormat) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: moduleContent, targetFormat" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert learning content formatter.
Convert the provided module content into the requested output format.
Maintain factual accuracy. Keep it professional. Keep it structured.
Do not remove important information. Do not add unrelated topics.

IMPORTANT: Return the output as valid JSON that can be parsed. Structure varies by format type.`;

    const userPrompt = `Convert the following module content into the requested format.

Module Content (Source of Truth)

${moduleContent}

Target Output Format

${targetFormat}
(One of: PPT / Article / Document / Video)

Formatting Preferences

${JSON.stringify(formatPreferences || {})}

FORMAT RULES BY TYPE:

If targetFormat = PPT:

Create slide-wise output as JSON array with structure:
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "...",
      "bulletPoints": ["...", "..."],
      "speakerNotes": "..." (if enabled),
      "imageSuggestion": "..." (if includeImages = Yes)
    }
  ]
}

Each slide must have:

Slide Title

3–6 bullet points max

Optional: Speaker Notes (if enabled)

Image suggestion (if includeImages = Yes)

Keep it clean and presentation-ready

If targetFormat = Article:

Return JSON with structure:
{
  "title": "...",
  "introduction": "...",
  "sections": [
    {
      "heading": "...",
      "subheading": "...",
      "content": "..."
    }
  ],
  "conclusion": "..."
}

Use headings + subheadings

Add short intro + conclusion

Keep it scannable and professional

If targetFormat = Document:

Return JSON with structure:
{
  "title": "...",
  "sections": [
    {
      "sectionTitle": "...",
      "definitions": [...],
      "content": "...",
      "recapBox": "..."
    }
  ]
}

Write in textbook/workbook style

Use sections, definitions, and recap boxes

Keep it detailed and structured

If targetFormat = Video:

Return JSON with structure:
{
  "title": "...",
  "totalDuration": "...",
  "scenes": [
    {
      "sceneNumber": 1,
      "sceneTitle": "...",
      "narration": "...",
      "visualDescription": "..." (if storyboard requested)
    }
  ]
}

Output a voiceover-friendly script

Break into scenes

Add scene titles + narration

If storyboard requested, add visuals per scene

Return ONLY the valid JSON output.`;

    console.log("Formatting content to:", targetFormat);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let formattedContent = data.choices?.[0]?.message?.content;

    if (!formattedContent) {
      throw new Error("No formatted content generated from AI");
    }

    try {
      formattedContent = formattedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(formattedContent);
      formattedContent = parsed;
    } catch {
      console.log("Content is not valid JSON, returning as raw text");
    }

    console.log("Content formatted successfully");

    return new Response(
      JSON.stringify({ formattedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in format-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
