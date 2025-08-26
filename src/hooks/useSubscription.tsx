import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
}

interface UsageData {
  can_proceed: boolean;
  current_usage: number;
  limit: number | string;
  plan_tier: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const checkSubscription = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      // Set default free plan if check fails
      setSubscription({
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createCheckout = async (plan: 'starter' | 'pro') => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour souscrire",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      // Open customer portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail client",
        variant: "destructive",
      });
    }
  };

  const checkUsageLimit = async (actionType: 'plan_generation' | 'visual_identity' | 'media_upload'): Promise<UsageData | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('check-usage-limit', {
        body: { action_type: actionType }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return null;
    }
  };

  const recordUsage = async (actionType: 'plan_generation' | 'visual_identity' | 'media_upload', projectId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('record-usage', {
        body: { 
          action_type: actionType,
          project_id: projectId 
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user, checkSubscription]);

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    checkUsageLimit,
    recordUsage
  };
};