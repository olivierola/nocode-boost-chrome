import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, Circle, Sparkles, Play, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PromptResourceInserter from '@/components/PromptResourceInserter';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  prompt: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface TimelineStepperProps {
  steps?: TimelineStep[];
  onPromptChange?: (stepId: string, newPrompt: string) => void;
  isExecuting?: boolean;
  onExecute?: () => void;
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({
  steps = [],
  onPromptChange,
  isExecuting = false,
  onExecute,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handlePromptChange = (stepId: string, value: string) => {
    setEditingPrompts((prev) => ({
      ...prev,
      [stepId]: value,
    }));
    onPromptChange?.(stepId, value);
  };

  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-background" />;
      case 'current':
        return <Sparkles className="w-5 h-5 text-background" />;
      case 'upcoming':
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepStyles = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-emerald-600 to-emerald-700 shadow-lg shadow-emerald-500/30';
      case 'current':
        return 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-600 shadow-lg shadow-amber-500/40 ring-4 ring-amber-500/20';
      case 'upcoming':
        return 'bg-muted border-2 border-border';
    }
  };

  const getCardStyles = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background';
      case 'current':
        return 'border-amber-300 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-background dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-background shadow-xl shadow-amber-500/10';
      case 'upcoming':
        return 'border-border bg-background/50';
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative">
        {/* Central timeline line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-emerald-600 via-amber-500 to-border" />

        {steps.map((step, index) => {
          const isExpanded = expandedSteps.has(step.id);
          const currentPrompt = editingPrompts[step.id] ?? step.prompt;
          const isLeft = index % 2 === 0;

          return (
            <div key={step.id} className="relative pb-16 last:pb-0">
              <div className={cn("flex items-center gap-6", isLeft ? "flex-row" : "flex-row-reverse")}>
                {/* Card */}
                <div className="flex-1 max-w-[calc(50%-48px)]">
                  <Card
                    className={cn(
                      'transition-all duration-300 hover:shadow-xl',
                      getCardStyles(step.status),
                      isExecuting && step.status === 'current' && 'animate-pulse ring-2 ring-amber-500'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CardTitle className="text-lg font-bold">
                              {step.title}
                            </CardTitle>
                            <Badge
                              variant={
                                step.status === 'completed'
                                  ? 'default'
                                  : step.status === 'current'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className={cn(
                                'capitalize text-xs',
                                step.status === 'completed' &&
                                  'bg-emerald-600 hover:bg-emerald-700',
                                step.status === 'current' &&
                                  'bg-amber-600 hover:bg-amber-700 text-white'
                              )}
                            >
                              {step.status === 'completed' ? 'Complété' : step.status === 'current' ? 'En cours' : 'À venir'}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">
                            {step.description}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStep(step.id)}
                          className="flex-shrink-0 h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>AI Prompt</span>
                            </div>
                            <PromptResourceInserter
                              onInsertResource={(resource) => {
                                handlePromptChange(step.id, currentPrompt + resource);
                              }}
                            />
                          </div>
                          <Textarea
                            value={currentPrompt}
                            onChange={(e) =>
                              handlePromptChange(step.id, e.target.value)
                            }
                            className="min-h-[100px] resize-none bg-background/50 border-2 focus:border-amber-500/50 focus:ring-amber-500/20 transition-all text-sm"
                            placeholder="Enter your prompt here..."
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-lg shadow-amber-500/30 h-8 text-xs"
                            >
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>

                {/* Center dot */}
                <div className="relative flex-shrink-0 z-10">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                      getStepStyles(step.status)
                    )}
                  >
                    {getStepIcon(step.status)}
                  </div>
                </div>

                {/* Empty space on the other side */}
                <div className="flex-1 max-w-[calc(50%-48px)]" />
              </div>
            </div>
          );
        })}

        {/* Timeline Status Footer */}
        <div className="mt-12 pt-8 border-t">
          <Card className="bg-gradient-to-br from-background to-amber-50/20 dark:to-amber-950/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  {steps.every(s => s.status === 'completed') ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      <div>
                        <h3 className="font-bold text-lg">Timeline Complète</h3>
                        <p className="text-sm text-muted-foreground">Toutes les étapes ont été terminées avec succès</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-8 h-8 text-amber-600" />
                      <div>
                        <h3 className="font-bold text-lg">Timeline en cours</h3>
                        <p className="text-sm text-muted-foreground">
                          {steps.filter(s => s.status === 'completed').length} sur {steps.length} étapes complétées
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  onClick={onExecute}
                  disabled={isExecuting || steps.every(s => s.status === 'completed')}
                  className={cn(
                    'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-lg shadow-amber-500/30 transition-all',
                    isExecuting && 'animate-pulse'
                  )}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exécution...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Exécuter la Timeline
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
