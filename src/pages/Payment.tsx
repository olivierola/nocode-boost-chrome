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
import Pricing_05 from '@/components/ui/ruixen-pricing05';

const Payment = () => {
  const { user } = useAuth();
  const { subscription, createCheckout, openCustomerPortal, loading } = useSubscription();
  const [isDialogOpen, setIsDialogOpen] = useState(false);


  const handleSelectPlan = (planTitle: string, price: number) => {
    if (planTitle === 'Free') {
      toast({
        title: "Plan gratuit",
        description: "Vous utilisez déjà le plan gratuit !",
      });
      return;
    }
    
    if (planTitle === 'Pro') {
      createCheckout('pro');
    } else if (planTitle === 'Enterprise') {
      // Rediriger vers un formulaire de contact ou ouvrir une discussion
      window.open('mailto:contact@votre-app.com?subject=Demande Enterprise Plan', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Current Subscription Status */}
      {subscription?.subscribed && (
        <div className="container py-6">
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
        </div>
      )}

      {/* New Modern Pricing Section */}
      <Pricing_05 onSelectPlan={handleSelectPlan} />

      {/* Features Comparison Table */}
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Comparaison détaillée des fonctionnalités</CardTitle>
            <CardDescription className="text-center">
              Découvrez ce qui est inclus dans chaque plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 gap-4 font-medium border-b pb-2">
                <div>Fonctionnalité</div>
                <div className="text-center">Free</div>
                <div className="text-center">Pro</div>
                <div className="text-center">Enterprise</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Génération de plans</div>
                <div className="text-center">3/mois</div>
                <div className="text-center">Illimité</div>
                <div className="text-center">Illimité</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Identités visuelles</div>
                <div className="text-center">1/mois</div>
                <div className="text-center">Illimité</div>
                <div className="text-center">Illimité</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Upload de médias</div>
                <div className="text-center">5/mois</div>
                <div className="text-center">50/mois</div>
                <div className="text-center">Illimité</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Projets</div>
                <div className="text-center">1</div>
                <div className="text-center">10</div>
                <div className="text-center">Illimité</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Collaboration en équipe</div>
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
                <div className="text-center">✓</div>
                <div className="text-center">✓</div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Branding personnalisé</div>
                <div className="text-center">-</div>
                <div className="text-center">-</div>
                <div className="text-center">✓</div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>SLA garantie</div>
                <div className="text-center">-</div>
                <div className="text-center">-</div>
                <div className="text-center">✓</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SubscriptionDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
};

export default Payment;