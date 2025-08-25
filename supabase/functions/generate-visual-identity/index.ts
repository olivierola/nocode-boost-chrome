import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, style, industry } = await req.json();
    console.log('Generate visual identity request:', { projectDescription, style, industry });

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Generating visual identity with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en design et identité visuelle. Génère une palette de couleurs et des recommandations typographiques.
            
            Génère une identité visuelle complète sous forme JSON avec:
            - Palette de couleurs (primaire, secondaire, accent, neutres)
            - Recommandations typographiques (titres, corps, accents)
            - Styles et variantes UI
            - Guidelines d'utilisation
            
            Format de réponse attendu:
            {
              "couleurs": {
                "primaire": { "hex": "#000000", "nom": "Nom couleur", "usage": "Usage principal" },
                "secondaire": { "hex": "#000000", "nom": "Nom couleur", "usage": "Usage secondaire" },
                "accent": { "hex": "#000000", "nom": "Nom couleur", "usage": "Accents et CTA" },
                "neutres": [
                  { "hex": "#000000", "nom": "Noir", "usage": "Texte principal" },
                  { "hex": "#ffffff", "nom": "Blanc", "usage": "Arrière-plans" }
                ]
              },
              "polices": {
                "titre": { "nom": "Font Name", "fallback": "sans-serif", "poids": [400, 600, 700] },
                "corps": { "nom": "Font Name", "fallback": "sans-serif", "poids": [400, 500] },
                "accent": { "nom": "Font Name", "fallback": "serif", "poids": [400] }
              },
              "styles": {
                "boutons": { "radius": "8px", "shadow": "0 2px 4px rgba(0,0,0,0.1)" },
                "cartes": { "radius": "12px", "shadow": "0 4px 8px rgba(0,0,0,0.1)" },
                "inputs": { "radius": "6px", "border": "1px solid #e2e8f0" }
              }
            }`
          },
          {
            role: 'user',
            content: `Projet: ${projectDescription}
            Style souhaité: ${style || 'moderne et professionnel'}
            Secteur d'activité: ${industry || 'général'}
            
            Génère une identité visuelle cohérente et moderne adaptée à ce projet.`
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedContent = data.choices[0].message.content;
    console.log('Visual identity generated successfully');

    // Parse JSON from response
    try {
      // Remove markdown code blocks if present
      generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const identityData = JSON.parse(generatedContent);

      return new Response(JSON.stringify({
        success: true,
        identity: identityData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', generatedContent);
      
      // Fallback visual identity if JSON parsing fails
      const fallbackIdentity = {
        couleurs: {
          primaire: { hex: "#2563eb", nom: "Bleu Principal", usage: "Éléments principaux et CTA" },
          secondaire: { hex: "#64748b", nom: "Gris Ardoise", usage: "Textes secondaires" },
          accent: { hex: "#f59e0b", nom: "Orange Accent", usage: "Accents et highlights" },
          neutres: [
            { hex: "#1e293b", nom: "Gris Foncé", usage: "Texte principal" },
            { hex: "#f8fafc", nom: "Gris Clair", usage: "Arrière-plans" },
            { hex: "#ffffff", nom: "Blanc", usage: "Cartes et surfaces" }
          ]
        },
        polices: {
          titre: { nom: "Inter", fallback: "sans-serif", poids: [400, 600, 700] },
          corps: { nom: "Inter", fallback: "sans-serif", poids: [400, 500] },
          accent: { nom: "Playfair Display", fallback: "serif", poids: [400, 600] }
        },
        styles: {
          boutons: { radius: "8px", shadow: "0 2px 4px rgba(0,0,0,0.1)" },
          cartes: { radius: "12px", shadow: "0 4px 8px rgba(0,0,0,0.1)" },
          inputs: { radius: "6px", border: "1px solid #e2e8f0" }
        }
      };

      return new Response(JSON.stringify({
        success: true,
        identity: fallbackIdentity,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in generate-visual-identity function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});