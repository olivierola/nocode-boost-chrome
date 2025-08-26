import React from 'react';
import { Check, Crown, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

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
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              } ${plan.current ? 'border-green-500 bg-green-50/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Populaire
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  {plan.icon}
                  {plan.name}
                </CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm text-muted-foreground font-normal">
                    {plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className="w-full"
                  variant={plan.current ? 'outline' : plan.variant}
                  onClick={plan.action}
                  disabled={plan.disabled || plan.current}
                >
                  {plan.current ? 'Plan actuel' : plan.button}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionDialog;