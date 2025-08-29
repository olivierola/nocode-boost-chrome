import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import UsageLimitWarning from '@/components/UsageLimitWarning';
import SubscriptionDialog from '@/components/SubscriptionDialog';

const Payment = () => {
  const { user } = useAuth();
  const { subscription, createCheckout, openCustomerPortal, loading } = useSubscription();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const plans = [
    {
      name: 'Gratuit',
      price: '0€',
      period: '/mois',
      description: 'Parfait pour débuter',
      features: [
        '5 générations de plans par mois',
        '3 identités visuelles par mois',
        '10 uploads de médias par mois',
        'Support communautaire',
      ],
      button: 'Plan Actuel',
      action: () => {},
      current: !subscription?.subscribed,
      popular: false,
    },
    {
      name: 'Starter',
      price: '7,99€',
      period: '/mois',
      description: 'Pour les projets sérieux',
      features: [
        '50 générations de plans par mois',
        '20 identités visuelles par mois',
        '100 uploads de médias par mois',
        'Collaboration en équipe',
        'Support prioritaire',
      ],
      button: subscription?.subscribed && subscription?.subscription_tier === 'starter' ? 'Plan Actuel' : 'Choisir Starter',
      action: () => createCheckout('starter'),
      current: subscription?.subscribed && subscription?.subscription_tier === 'starter',
      popular: true,
    },
    {
      name: 'Pro',
      price: '19,99€',
      period: '/mois',
      description: 'Pour les équipes professionnelles',
      features: [
        'Générations illimitées',
        'Identités visuelles illimitées',
        'Uploads illimités',
        'Collaboration avancée',
        'Support prioritaire',
        'API access',
      ],
      button: subscription?.subscribed && subscription?.subscription_tier === 'pro' ? 'Plan Actuel' : 'Choisir Pro',
      action: () => createCheckout('pro'),
      current: subscription?.subscribed && subscription?.subscription_tier === 'pro',
      popular: false,
    },
  ];

  const handleUpgrade = () => {
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Plans et Abonnements</h1>
        <p className="text-muted-foreground">
          Choisissez le plan qui correspond à vos besoins
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription?.subscribed && (
        <Card className="border-primary bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Abonnement Actif</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {subscription.subscription_tier}
              </Badge>
            </div>
            <CardDescription>
              Votre abonnement est actif jusqu'au{' '}
              {subscription.subscription_end 
                ? new Date(subscription.subscription_end).toLocaleDateString('fr-FR')
                : 'N/A'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={openCustomerPortal}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Gérer mon abonnement
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Pricing Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''} ${plan.current ? 'bg-muted/30' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Populaire
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-foreground">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={plan.action}
                disabled={plan.current || loading}
                variant={plan.current ? 'secondary' : plan.popular ? 'default' : 'outline'}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Chargement...
                  </div>
                ) : (
                  <>
                    {!plan.current && plan.name !== 'Gratuit' && (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {plan.button}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des fonctionnalités</CardTitle>
          <CardDescription>
            Découvrez ce qui est inclus dans chaque plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-4 font-medium border-b pb-2">
              <div>Fonctionnalité</div>
              <div className="text-center">Gratuit</div>
              <div className="text-center">Starter</div>
              <div className="text-center">Pro</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Génération de plans</div>
              <div className="text-center">5/mois</div>
              <div className="text-center">50/mois</div>
              <div className="text-center">Illimité</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Identités visuelles</div>
              <div className="text-center">3/mois</div>
              <div className="text-center">20/mois</div>
              <div className="text-center">Illimité</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Upload de médias</div>
              <div className="text-center">10/mois</div>
              <div className="text-center">100/mois</div>
              <div className="text-center">Illimité</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Collaboration</div>
              <div className="text-center">-</div>
              <div className="text-center">✓</div>
              <div className="text-center">✓</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>Support prioritaire</div>
              <div className="text-center">-</div>
              <div className="text-center">✓</div>
              <div className="text-center">✓</div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>API Access</div>
              <div className="text-center">-</div>
              <div className="text-center">-</div>
              <div className="text-center">✓</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SubscriptionDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};

export default Payment;