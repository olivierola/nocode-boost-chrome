import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Eye, AlertTriangle, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AISuggestion {
  id: string;
  type: 'action' | 'warning' | 'optimization' | 'next_step';
  message: string;
  prompt?: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  metadata?: any;
}

interface ProjectStatus {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  projectState: string;
  lastActivity: string;
  errors: string[];
}

interface AIMonitorProps {
  planData: any;
  projectStatus: ProjectStatus;
  isActive: boolean;
  onSuggestionAction: (suggestion: AISuggestion) => void;
}

const AIMonitor = ({ planData, projectStatus, isActive, onSuggestionAction }: AIMonitorProps) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>('');

  const generateSuggestion = useCallback(async (context: any): Promise<AISuggestion | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-monitoring', {
        body: {
          planData,
          projectStatus,
          analysisType: 'progress_monitoring',
          context: 'ai_monitoring'
        }
      });

      if (error) throw error;

      if (data.suggestion) {
        return {
          id: `suggestion-${Date.now()}`,
          type: data.type || 'action',
          message: data.suggestion,
          prompt: data.prompt,
          priority: data.priority || 'medium',
          timestamp: new Date().toISOString(),
          metadata: data.metadata
        };
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la génération de suggestion:', error);
      return null;
    }
  }, [planData, projectStatus]);

  const monitorProgress = useCallback(async () => {
    if (!isActive || isMonitoring) return;

    setIsMonitoring(true);
    
    try {
      // Analyser le contexte pour détecter des opportunités d'amélioration
      const contexts = [
        { type: 'progress_check', interval: 30000 }, // Toutes les 30 secondes
        { type: 'error_detection', interval: 10000 }, // Toutes les 10 secondes si erreurs
        { type: 'optimization', interval: 60000 } // Toutes les minutes
      ];

      for (const context of contexts) {
        if (context.type === 'error_detection' && projectStatus.errors.length === 0) continue;
        
        const suggestion = await generateSuggestion(context);
        if (suggestion) {
          setSuggestions(prev => {
            // Éviter les doublons
            const exists = prev.some(s => s.message === suggestion.message);
            if (exists) return prev;
            
            // Garder seulement les 10 dernières suggestions
            const updated = [suggestion, ...prev].slice(0, 10);
            return updated;
          });
        }
      }

      setLastAnalysis(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Erreur lors du monitoring:', error);
    } finally {
      setIsMonitoring(false);
    }
  }, [isActive, isMonitoring, generateSuggestion, projectStatus]);

  // Monitoring automatique
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(monitorProgress, 30000); // Analyse toutes les 30 secondes
    
    // Première analyse immédiate
    monitorProgress();

    return () => clearInterval(interval);
  }, [isActive, monitorProgress]);

  // Surveillance des changements d'état du projet
  useEffect(() => {
    if (isActive) {
      monitorProgress();
    }
  }, [projectStatus.currentStep, projectStatus.errors.length, isActive, monitorProgress]);

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    onSuggestionAction(suggestion);
    
    // Marquer la suggestion comme acceptée
    setSuggestions(prev => 
      prev.map(s => 
        s.id === suggestion.id 
          ? { ...s, metadata: { ...s.metadata, accepted: true } }
          : s
      )
    );
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'action': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'warning': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'optimization': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'next_step': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (!isActive) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <Bot className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">IA de surveillance désactivée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-blue-600" />
          IA de Surveillance
          <Badge variant="outline" className="ml-auto">
            <Eye className="h-3 w-3 mr-1" />
            {isMonitoring ? 'Analyse...' : 'Actif'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* État du monitoring */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Dernière analyse:</span>
          <span className="font-mono text-xs">{lastAnalysis || 'En attente...'}</span>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Suggestions IA</h4>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {suggestions.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Aucune suggestion pour le moment. L'IA surveille votre progression.
                  </AlertDescription>
                </Alert>
              ) : (
                suggestions.map((suggestion) => (
                  <div 
                    key={suggestion.id}
                    className={`p-3 rounded-lg border ${getTypeColor(suggestion.type)}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {getPriorityIcon(suggestion.priority)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(suggestion.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{suggestion.message}</p>
                        
                        {suggestion.prompt && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                            <strong>Prompt suggéré:</strong>
                            <p className="mt-1 text-gray-700">{suggestion.prompt}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        disabled={suggestion.metadata?.accepted}
                        className="text-xs"
                      >
                        {suggestion.metadata?.accepted ? 'Accepté' : 'Appliquer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismissSuggestion(suggestion.id)}
                        className="text-xs"
                      >
                        Ignorer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Métriques de monitoring */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {projectStatus.completedSteps}
            </div>
            <div className="text-xs text-gray-500">Complétées</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              {projectStatus.errors.length}
            </div>
            <div className="text-xs text-gray-500">Erreurs</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {suggestions.filter(s => s.type === 'optimization').length}
            </div>
            <div className="text-xs text-gray-500">Optimisations</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIMonitor;