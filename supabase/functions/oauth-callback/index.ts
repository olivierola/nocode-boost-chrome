import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    console.log('OAuth callback received:', { code: !!code, error, errorDescription });

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      
      const redirectUrl = `${url.origin}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('User authenticated successfully:', data.user?.email);

    if (data.user) {
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: data.user.id,
          action: 'oauth_login',
          details: {
            provider: 'oauth',
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('Error logging authentication:', logError);
      }
    }

    const redirectUrl = `${url.origin}/?auth=success`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        'Set-Cookie': `sb-access-token=${data.session?.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      },
    });

  } catch (error) {
    console.error('Error in oauth-callback function:', error);
    
    const url = new URL(req.url);
    const redirectUrl = `${url.origin}/?error=auth_failed&error_description=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });
  }
});