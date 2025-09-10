import React from 'react';
import { Check, Crown, Users, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as PricingCard from '@/components/ui/pricing-card';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubscriptionDialog: React.FC<SubscriptionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createCheckout, subscription } = useSubscription();

  const plans = [
    {
      name: 'Gratuit',
      price: '0€',
      period: '/mois',
      description: 'Pour découvrir la plateforme',
      features: [
        '5 générations de plans/mois',
        '2 identités visuelles/mois',
        '10 uploads de médias/mois',
        'Pas de collaboration'
      ],
      button: 'Plan actuel',
      variant: 'outline' as const,
      disabled: true,
      current: subscription?.subscription_tier === 'free'
    },
    {
      name: 'Starter',
      price: '19,99€',
      period: '/mois',
      description: 'Pour les projets personnels',
      features: [
        '50 générations de plans/mois',
        '10 identités visuelles/mois',
        '100 uploads de médias/mois',
        'Support par email'
      ],
      button: 'Choisir Starter',
      variant: 'default' as const,
      action: () => createCheckout('starter'),
      current: subscription?.subscription_tier === 'starter'
    },
    {
      name: 'Pro',
      price: '49,99€',
      period: '/mois',
      description: 'Pour les équipes et professionnels',
      features: [
        'Générations illimitées',
        'Identités visuelles illimitées',
        'Uploads illimités',
        'Collaboration en équipe',
        'Support prioritaire'
      ],
      button: 'Choisir Pro',
      variant: 'default' as const,
      action: () => createCheckout('pro'),
      icon: <Crown className="h-5 w-5" />,
      popular: true,
      current: subscription?.subscription_tier === 'pro'
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            Choisissez votre plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Sélectionnez le plan qui correspond le mieux à vos besoins
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-6 py-6">
          {(plans || []).map((plan) => (
            <PricingCard.Card
              key={plan.name}
              className={cn(
                plan.popular && 'scale-105',
                plan.current && 'border-green-500/50'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <PricingCard.Badge className="bg-primary text-primary-foreground">
                    Populaire
                  </PricingCard.Badge>
                </div>
              )}
              
              <PricingCard.Header>
                <PricingCard.Plan>
                  <PricingCard.PlanName>
                    {plan.icon || <Users aria-hidden="true" />}
                    <span>{plan.name}</span>
                  </PricingCard.PlanName>
                  <PricingCard.Badge>
                    {plan.name === 'Gratuit' ? 'Découverte' : 
                     plan.name === 'Starter' ? 'Personnel' : 'Professionnel'}
                  </PricingCard.Badge>
                </PricingCard.Plan>
                
                <PricingCard.Price>
                  <PricingCard.MainPrice>{plan.price}</PricingCard.MainPrice>
                  <PricingCard.Period>{plan.period}</PricingCard.Period>
                </PricingCard.Price>
                
                <PricingCard.Description>
                  {plan.description}
                </PricingCard.Description>
                
                <Button
                  className={cn(
                    'w-full font-semibold',
                    plan.popular && 'bg-gradient-to-b from-primary to-primary/90 shadow-lg'
                  )}
                  variant={plan.current ? 'outline' : plan.variant}
                  onClick={plan.action}
                  disabled={plan.disabled || plan.current}
                >
                  {plan.current ? 'Plan actuel' : plan.button}
                </Button>
              </PricingCard.Header>
              
              <PricingCard.Body>
                <PricingCard.List>
                  {(plan.features || []).map((feature, index) => (
                    <PricingCard.ListItem key={index}>
                      <span className="mt-0.5">
                        <Check
                          className="h-4 w-4 text-green-500"
                          aria-hidden="true"
                        />
                      </span>
                      <span>{feature}</span>
                    </PricingCard.ListItem>
                  ))}
                </PricingCard.List>
              </PricingCard.Body>
            </PricingCard.Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;