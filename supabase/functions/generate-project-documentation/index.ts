import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentationRequest {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  planData?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, projectName, projectDescription, planData }: DocumentationRequest = await req.json();

    if (!projectId || !projectName) {
      throw new Error('Project ID and name are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get OpenAI API Key from secrets
    const { data: secretData, error: secretError } = await supabaseClient
      .from('vault_secrets')
      .select('secret')
      .eq('name', 'OPENAI_API_KEY')
      .single();

    if (secretError || !secretData) {
      throw new Error('OpenAI API key not configured');
    }

    const openaiApiKey = secretData.secret;

    // Construire le prompt pour générer la documentation
    const systemPrompt = `Tu es un expert en documentation de projets SaaS. Tu dois générer une documentation complète et professionnelle pour un projet.
    
La documentation doit inclure :
1. Un titre clair et descriptif
2. Une description concise du projet (2-3 phrases)
3. Une documentation markdown complète et détaillée contenant :
   - Études de marché et opportunités
   - Analyse du projet (objectifs, cible, proposition de valeur unique)
   - Fonctionnalités principales (détaillées)
   - Cas d'usage typiques
   - Architecture technique recommandée
   - Modèle économique
   - Roadmap suggérée
   - Recommandations de sécurité et conformité

Format de réponse JSON :
{
  "title": "Titre du projet",
  "description": "Description courte",
  "documentation_markdown": "# Documentation complète en markdown..."
}`;

    const userPrompt = `Génère une documentation complète pour ce projet :

Nom : ${projectName}
${projectDescription ? `Description : ${projectDescription}` : ''}
${planData ? `Plan existant : ${JSON.stringify(planData, null, 2)}` : ''}

Créer une documentation professionnelle, détaillée et actionnelle.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const documentationData = JSON.parse(data.choices[0].message.content);

    // Save documentation to database
    const { error: saveError } = await supabaseClient
      .from('project_documentation')
      .upsert({
        project_id: projectId,
        title: documentationData.title,
        description: documentationData.description,
        documentation_markdown: documentationData.documentation_markdown,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      });

    if (saveError) {
      console.error('Error saving documentation:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentation: documentationData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
