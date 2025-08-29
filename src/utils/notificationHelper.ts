import { supabase } from '@/integrations/supabase/client';

export const createNotification = async (
  userId: string,
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  message: string,
  metadata: Record<string, any> = {}
) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const notifyPlanStepCompletion = async (
  userId: string,
  planId: string,
  stepName: string,
  stepIndex: number,
  totalSteps: number
) => {
  try {
    const { data, error } = await supabase.rpc('notify_plan_step_completion', {
      p_user_id: userId,
      p_plan_id: planId,
      p_step_name: stepName,
      p_step_index: stepIndex,
      p_total_steps: totalSteps
    });

    if (error) {
      console.error('Error notifying plan step completion:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error notifying plan step completion:', error);
    return null;
  }
};

export const notifyPlanCompletion = async (
  userId: string,
  planId: string,
  planTitle: string
) => {
  try {
    const { data, error } = await supabase.rpc('notify_plan_completion', {
      p_user_id: userId,
      p_plan_id: planId,
      p_plan_title: planTitle
    });

    if (error) {
      console.error('Error notifying plan completion:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error notifying plan completion:', error);
    return null;
  }
};