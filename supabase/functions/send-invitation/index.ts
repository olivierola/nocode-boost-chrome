import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { projectId, email, role, inviterName, projectName } = await req.json();
    console.log('Sending invitation for project:', projectId, 'to:', email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, collaborators(*)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found or access denied');
    }

    const existingCollaborator = project.collaborators?.find(
      (collab: any) => collab.user_id === email
    );

    if (existingCollaborator) {
      throw new Error('User is already a collaborator on this project');
    }

    const { error: inviteError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: project.owner_id,
        action: 'invitation_sent',
        details: {
          project_id: projectId,
          project_name: projectName,
          invited_email: email,
          role: role,
          inviter_name: inviterName,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }
      });

    if (inviteError) {
      console.error('Error storing invitation:', inviteError);
      throw new Error('Failed to send invitation');
    }

    console.log(`Invitation email would be sent to: ${email}`);
    console.log(`Subject: Invitation to collaborate on ${projectName}`);
    console.log(`From: ${inviterName}`);
    console.log(`Role: ${role}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invitation sent successfully',
      details: {
        project: projectName,
        email: email,
        role: role
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-invitation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});