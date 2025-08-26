import React from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface UsageLimitWarningProps {
  actionType: string;
  currentUsage: number;
  limit: number | string;
  onUpgrade: () => void;
}

const UsageLimitWarning: React.FC<UsageLimitWarningProps> = ({
  actionType,
  currentUsage,
  limit,
  onUpgrade,
}) => {
  const getActionLabel = (type: string) => {
    switch (type) {
      case 'plan_generation':
        return 'génération de plan';
      case 'visual_identity':
        return 'identité visuelle';
      case 'media_upload':
        return 'upload de média';
      default:
        return 'action';
    }
  };

  const isUnlimited = limit === 'unlimited' || limit === -1;
  const isAtLimit = !isUnlimited && currentUsage >= (limit as number);

  if (isUnlimited) return null;

  return (
    <Alert className={`mb-4 ${isAtLimit ? 'border-destructive' : 'border-orange-500'}`}>
      <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-destructive' : 'text-orange-500'}`} />
      <AlertDescription className="flex items-center justify-between">
        <div>
          {isAtLimit ? (
            <span>
              Limite atteinte pour {getActionLabel(actionType)} ce mois ({currentUsage}/{limit as number})
            </span>
          ) : (
            <span>
              Utilisation de {getActionLabel(actionType)}: {currentUsage}/{limit as number} ce mois
            </span>
          )}
        </div>
        {isAtLimit && (
          <Button size="sm" onClick={onUpgrade} className="ml-4">
            <Crown className="h-4 w-4 mr-2" />
            Mettre à niveau
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default UsageLimitWarning;