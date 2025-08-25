import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { userEmail, projectId } = await req.json();
    console.log('Send invitation request:', { userEmail, projectId });

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Check if user is project owner
    if (project.owner_id !== user.id) {
      throw new Error('Only project owner can send invitations');
    }

    // In a real implementation, you would:
    // 1. Generate a unique invitation token
    // 2. Store invitation in database with expiration
    // 3. Send email via email service (SendGrid, Resend, etc.)
    // 4. Include invitation link with token

    // For now, we'll simulate the email sending
    console.log(`Sending invitation email to ${userEmail} for project ${project.name}`);

    // Simulate email content
    const invitationLink = `${Deno.env.get('SITE_URL')}/invite?token=simulated-token`;
    const emailContent = {
      to: userEmail,
      subject: `Invitation to collaborate on ${project.name}`,
      html: `
        <h2>You've been invited to collaborate!</h2>
        <p>You've been invited to collaborate on the project "${project.name}".</p>
        <p><a href="${invitationLink}">Click here to accept the invitation</a></p>
        <p>If you don't have an account yet, you'll need to sign up first.</p>
      `
    };

    console.log('Email content prepared:', emailContent);

    // Here you would integrate with your email service
    // For demo purposes, we'll just return success
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Invitation sent successfully',
      invitationLink // In production, don't return this
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-invitation function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});