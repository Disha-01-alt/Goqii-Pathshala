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

    const { moduleContent, numberOfAssignments, type, rubricRequired } = await req.json();

    if (!moduleContent || !numberOfAssignments) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: moduleContent, numberOfAssignments" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a learning designer. Create practical assignments from the module content only.
Return the output as a valid JSON array of assignments.`;

    const userPrompt = `Create ${numberOfAssignments} assignments based ONLY on this module content:
${moduleContent}

Assignment Type: ${type || "worksheet"}
Include Rubric: ${rubricRequired ? "Yes" : "No"}

For each assignment, return a JSON object with:
- id: unique string
- title: assignment title
- goal: what the learner should achieve
- instructions: step-by-step instructions
- expectedOutput: what the deliverable should look like
- evaluationCriteria: array of 3-5 bullet points for grading${rubricRequired ? `
- rubric: array of grading criteria objects with:
  - criterion: what is being evaluated
  - excellent: description of excellent performance
  - good: description of good performance
  - needsImprovement: description of what needs improvement` : ''}
- included: true (default, can be toggled by user)

Return ONLY a valid JSON array of assignments.

Example format:
[
  {
    "id": "a1",
    "title": "Practical Application Exercise",
    "goal": "Apply the concepts learned...",
    "instructions": "1. Review the key concepts...\\n2. Identify a real-world scenario...\\n3. Apply the framework...",
    "expectedOutput": "A 1-2 page document that demonstrates...",
    "evaluationCriteria": [
      "Clear application of concepts",
      "Logical reasoning",
      "Professional presentation"
    ],
    "included": true
  }
]`;

    console.log("Generating", numberOfAssignments, "assignments of type:", type);

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
    let assignmentContent = data.choices?.[0]?.message?.content;

    if (!assignmentContent) {
      throw new Error("No assignment content generated from AI");
    }

    try {
      assignmentContent = assignmentContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const assignments = JSON.parse(assignmentContent);
      
      console.log("Assignments generated successfully:", assignments.length, "assignments");

      return new Response(
        JSON.stringify({ assignments }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse assignments JSON:", parseError);
      throw new Error("Failed to parse assignments response as JSON");
    }
  } catch (error) {
    console.error("Error in generate-assignments:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
