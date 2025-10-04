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

// Appel IA avec fallback OpenAI -> Groq
async function callAIWithFallback(systemPrompt: string, userPrompt: string, OPENAI_API_KEY?: string, GROQ_API_KEY?: string) {
  // Essai OpenAI
  if (OPENAI_API_KEY) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt + '\nRéponds STRICTEMENT en JSON valide.' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('OpenAI error (doc):', e);
    }
  }

  // Fallback Groq
  if (GROQ_API_KEY) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt + '\nRéponds STRICTEMENT en JSON valide. Ne renvoie que l\'objet JSON demandé.' },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.7
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const content: string = data.choices?.[0]?.message?.content || '{}';
        try { return JSON.parse(content); } catch {
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            return JSON.parse(content.slice(start, end + 1));
          }
          throw new Error('Réponse Groq non JSON');
        }
      }
    } catch (e) {
      console.error('Groq error (doc):', e);
    }
  }

  throw new Error('Aucune API IA n\'a pu générer la documentation');
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

    // Get existing documentation for context
    const { data: existingDoc } = await supabaseClient
      .from('project_documentation')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const previousDocContext = existingDoc 
      ? `\n\n### Documentation Précédente (pour contexte et amélioration)
**Titre précédent :** ${existingDoc.title}
**Description précédente :** ${existingDoc.description}
**Extrait de la documentation :**
${existingDoc.documentation_markdown.substring(0, 1500)}...

**IMPORTANT :** Utilise cette documentation précédente comme base, améliore-la et enrichis-la avec les nouvelles informations du plan.`
      : '';

    // Récupération des clés API depuis les secrets d'environnement
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!OPENAI_API_KEY && !GROQ_API_KEY) {
      throw new Error('Aucune clé API IA configurée (OpenAI ou Groq requise)');
    }

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
${existingDoc ? '\n**IMPORTANT :** Une documentation précédente existe. Utilise-la comme base et améliore-la avec les nouvelles informations.' : ''}

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
${previousDocContext}

Créer une documentation professionnelle, détaillée et actionnelle.`;

    // Appel IA avec fallback (OpenAI -> Groq)
    const documentationData = await callAIWithFallback(systemPrompt, userPrompt, OPENAI_API_KEY || undefined, GROQ_API_KEY || undefined);

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
