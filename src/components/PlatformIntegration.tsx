import React, { useEffect, useState } from 'react';
import { PlatformDetector, NoCodePlatform } from '@/services/platformDetector';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Eye, Send } from 'lucide-react';
import { createNotification } from '@/utils/notificationHelper';

interface PlatformIntegrationProps {
  onPromptEnhancement?: (originalPrompt: string, enhancedPrompt: string) => void;
  onErrorDetection?: (errors: any[]) => void;
}

const PlatformIntegration: React.FC<PlatformIntegrationProps> = ({
  onPromptEnhancement,
  onErrorDetection
}) => {
  const [detector] = useState(() => new PlatformDetector());
  const [detectedPlatform, setDetectedPlatform] = useState<NoCodePlatform | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [foundIssues, setFoundIssues] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const detectCurrentPlatform = async () => {
      try {
        const platform = await detector.detectPlatform();
        setDetectedPlatform(platform);
        
        if (platform) {
          toast({
            title: "Plateforme détectée",
            description: `${platform.name} détectée! Fonctionnalités d'amélioration activées.`,
          });

          // Create notification
          if (user) {
            await createNotification(
              user.id,
              'info',
              'Plateforme détectée',
              `${platform.name} détectée! Extension activée.`,
              { platform: platform.name, action: 'platform_detected' }
            );
          }

          // Configurer l'interception des prompts
          detector.interceptPrompts(async (prompt, element) => {
            if (onPromptEnhancement) {
              const enhancedPrompt = enhancePromptForPlatform(prompt, platform);
              onPromptEnhancement(prompt, enhancedPrompt);
              
              // Create notification for prompt enhancement
              if (user && enhancedPrompt !== prompt) {
                await createNotification(
                  user.id,
                  'success',
                  'Prompt amélioré',
                  `Prompt optimisé automatiquement sur ${platform.name}`,
                  { platform: platform.name, action: 'prompt_enhancement' }
                );
              }
            }
          });
        }
      } catch (error) {
        console.error('Erreur lors de la détection de plateforme:', error);
      }
    };

    detectCurrentPlatform();
  }, [detector, onPromptEnhancement, toast]);

  const enhancePromptForPlatform = (prompt: string, platform: NoCodePlatform): string => {
    const platformContext = `[Contexte: ${platform.name}] `;
    const enhancedPrompt = platformContext + prompt + 
      `\n\nVeuillez optimiser cette réponse pour ${platform.name} en tenant compte des meilleures pratiques de la plateforme.`;
    
    return enhancedPrompt;
  };

  const scanForIssues = async () => {
    if (!detectedPlatform) {
      toast({
        title: "Aucune plateforme détectée",
        description: "Veuillez naviguer vers une plateforme supportée",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    try {
      const issues = await detector.scanForIssues(detectedPlatform);
      setFoundIssues(issues);
      
      if (onErrorDetection) {
        onErrorDetection(issues);
      }

      toast({
        title: "Analyse terminée",
        description: `${issues.length} problèmes détectés`,
      });

      // Create notification
      if (user) {
        await createNotification(
          user.id,
          issues.length > 0 ? 'warning' : 'success',
          'Analyse terminée',
          `${issues.length} problème(s) détecté(s) sur ${detectedPlatform.name}`,
          { 
            platform: detectedPlatform.name, 
            action: 'page_scan',
            issues_count: issues.length
          }
        );
      }
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'analyser la page",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const fixIssue = async (issue: any) => {
    if (!detectedPlatform) return;

    const fixPrompt = detector.generateFixPrompt(issue, detectedPlatform);
    
    toast({
      title: "Correction en cours",
      description: "Génération de la solution...",
    });

    // Create notification for issue fix attempt
    if (user) {
      await createNotification(
        user.id,
        'info',
        'Correction en cours',
        `Tentative de correction: ${issue.title}`,
        { 
          platform: detectedPlatform.name, 
          action: 'issue_fix_attempt',
          issue_title: issue.title,
          issue_severity: issue.severity
        }
      );
    }

    // Ici vous pourriez intégrer avec votre système de génération de prompts
    console.log('Fix prompt:', fixPrompt);
  };

  if (!detectedPlatform) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Détection de plateforme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Naviguez vers une plateforme no-code supportée pour activer les fonctionnalités d'amélioration.
          </p>
          <div className="space-y-2">
            <Badge variant="outline">Webflow</Badge>
            <Badge variant="outline">Bubble</Badge>
            <Badge variant="outline">Framer</Badge>
            <Badge variant="outline">Notion</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span style={{ color: detectedPlatform.color }}>
            {detectedPlatform.icon}
          </span>
          {detectedPlatform.name} détecté
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Fonctionnalités disponibles:</h4>
          <div className="grid grid-cols-2 gap-2">
            {detectedPlatform.capabilities.errorDetection && (
              <Badge variant="secondary">Détection d'erreurs</Badge>
            )}
            {detectedPlatform.capabilities.performanceAnalysis && (
              <Badge variant="secondary">Performance</Badge>
            )}
            {detectedPlatform.capabilities.seoAudit && (
              <Badge variant="secondary">SEO</Badge>
            )}
            {detectedPlatform.capabilities.accessibilityCheck && (
              <Badge variant="secondary">Accessibilité</Badge>
            )}
            {detectedPlatform.capabilities.designConsistency && (
              <Badge variant="secondary">Design</Badge>
            )}
          </div>
        </div>

        <Button 
          onClick={scanForIssues} 
          disabled={isScanning}
          className="w-full"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isScanning ? 'Analyse en cours...' : 'Analyser la page'}
        </Button>

        {foundIssues.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Problèmes détectés ({foundIssues.length}):</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {foundIssues.map((issue, index) => (
                <div key={index} className="border rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{issue.title}</span>
                    <Badge 
                      variant={issue.severity === 'high' ? 'destructive' : 
                              issue.severity === 'medium' ? 'default' : 'secondary'}
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {issue.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => fixIssue(issue)}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Corriger
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlatformIntegration;