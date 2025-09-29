import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, message, userId } = await req.json();
    console.log('Realtime chat action:', action, 'for project:', projectId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'send_message':
        const { error: logError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            action: 'chat_message',
            details: {
              project_id: projectId,
              message: message,
              timestamp: new Date().toISOString()
            }
          });

        if (logError) {
          console.error('Error storing message:', logError);
          throw new Error('Failed to store message');
        }

        const { data: collaborators } = await supabase
          .from('collaborators')
          .select('user_id')
          .eq('project_id', projectId)
          .neq('user_id', userId);

        console.log(`Message sent to ${collaborators?.length || 0} collaborators`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Message sent successfully',
          recipients: collaborators?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_messages':
        const { data: messages, error: messagesError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('action', 'chat_message')
          .contains('details', { project_id: projectId })
          .order('timestamp', { ascending: false })
          .limit(50);

        if (messagesError) {
          console.error('Error retrieving messages:', messagesError);
          throw new Error('Failed to retrieve messages');
        }

        return new Response(JSON.stringify({ 
          messages: messages || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in realtime-chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});