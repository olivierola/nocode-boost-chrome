import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, planId } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get previous report
    const { data: previousReport } = await supabaseClient
      .from('agent_progress_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get new actions since last report
    const lastReportDate = previousReport?.created_at || new Date(0).toISOString();
    const { data: newActions, error: actionsError } = await supabaseClient
      .from('agent_actions')
      .select('*')
      .eq('project_id', projectId)
      .gt('created_at', lastReportDate)
      .order('created_at', { ascending: true });

    if (actionsError) {
      throw new Error(`Error fetching actions: ${actionsError.message}`);
    }

    // Get plan data
    const { data: planData } = planId ? await supabaseClient
      .from('plans')
      .select('plan_data')
      .eq('id', planId)
      .single()
      : { data: null };

    // Get project info
    const { data: project } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `Tu es un expert en gestion de projet et reporting. 
Tu dois générer un rapport d'avancement professionnel et détaillé basé sur les actions effectuées par l'agent IA.

### Contexte du projet
Projet: ${project?.name || 'Sans nom'}
${project?.description ? `Description: ${project.description}` : ''}

### Rapport précédent
${previousReport ? `
**Résumé précédent:** ${previousReport.summary}
**Date:** ${new Date(previousReport.created_at).toLocaleDateString('fr-FR')}
` : 'Aucun rapport précédent'}

### Nouvelles actions effectuées (${newActions?.length || 0} actions)
${newActions && newActions.length > 0 ? newActions.map((action, idx) => `
**Action ${idx + 1}:** ${action.action_type}
- Étape: ${action.step_name || 'N/A'}
- Détails: ${JSON.stringify(action.action_details)}
- Résultat: ${action.result || 'En cours'}
- Date: ${new Date(action.created_at).toLocaleDateString('fr-FR')}
`).join('\n') : 'Aucune nouvelle action'}

### Instructions
Génère un rapport markdown complet incluant:
1. **Résumé exécutif** - Vue d'ensemble des progrès
2. **Actions effectuées** - Liste détaillée et organisée des actions
3. **Étapes intermédiaires créées** - Si applicable
4. **Ressources utilisées** - Composants, styles, polices utilisés
5. **Optimisations appliquées** - Améliorations des prompts
6. **Prochaines étapes suggérées** - Recommandations
7. **Indicateurs de progrès** - Métriques clés

Format: Markdown professionnel avec structure claire.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Génère le rapport d\'avancement basé sur le contexte fourni.' }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reportMarkdown = data.choices[0].message.content;

    // Extract summary (first paragraph)
    const summary = reportMarkdown.split('\n\n')[0].substring(0, 500);

    // Save the report
    const { data: savedReport, error: saveError } = await supabaseClient
      .from('agent_progress_reports')
      .insert({
        project_id: projectId,
        plan_id: planId,
        user_id: user.id,
        report_markdown: reportMarkdown,
        summary: summary,
        actions_covered: newActions?.map(a => a.id) || [],
        metadata: {
          total_actions: newActions?.length || 0,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Error saving report: ${saveError.message}`);
    }

    return new Response(JSON.stringify({ report: savedReport }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-progress-report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});