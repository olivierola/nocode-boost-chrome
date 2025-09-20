import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Target } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PlanStepCards from '@/components/ui/plan-step-cards';
import EditStepDialog from '@/components/ui/edit-step-dialog';

interface ProjectPlan {
  id: string;
  project_id: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'validated' | 'executing' | 'completed';
  plan_type?: 'standard' | 'mindmap';
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
  }>;
  features?: Array<{
    name: string;
    description: string;
    priority?: string;
    prompt?: string;
    sub_features?: Array<{
      name: string;
      description: string;
      priority?: string;
      prompt?: string;
    }>;
  }>;
  pages?: Array<{
    name: string;
    description: string;
    priority?: string;
    prompt?: string;
  }>;
}

interface PlanTableViewProps {
  plan: ProjectPlan;
  onExecuteFeature?: (feature: any) => void;
}

export const PlanTableView: React.FC<PlanTableViewProps> = ({ plan, onExecuteFeature }) => {
  const [editingStep, setEditingStep] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'error': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Convert plan data to step format
  const convertPlanToSteps = () => {
    const steps: any[] = [];
    
    // Add features as implementation steps
    if (plan?.features && Array.isArray(plan.features)) {
      plan.features.forEach((feature, index) => {
        steps.push({
          id: `feature-${index}`,
          title: feature.name,
          description: feature.description,
          prompt: feature.prompt || '',
          type: 'implementation',
          status: 'pending'
        });

        // Add sub-features
        if (feature.sub_features && Array.isArray(feature.sub_features)) {
          feature.sub_features.forEach((subFeature, subIndex) => {
            steps.push({
              id: `subfeature-${index}-${subIndex}`,
              title: subFeature.name,
              description: subFeature.description,
              prompt: subFeature.prompt || '',
              type: 'implementation',
              status: 'pending'
            });
          });
        }
      });
    }

    // Add pages as documentation steps
    if (plan?.pages && Array.isArray(plan.pages)) {
      plan.pages.forEach((page, index) => {
        steps.push({
          id: `page-${index}`,
          title: page.name,
          description: page.description,
          prompt: page.prompt || '',
          type: 'documentation',
          status: 'pending'
        });
      });
    }

    // Add plan steps
    if (plan?.steps && Array.isArray(plan.steps)) {
      plan.steps.forEach((step, index) => {
        steps.push({
          id: step.id || `step-${index}`,
          title: step.title,
          description: step.description,
          prompt: '',
          type: 'implementation',
          status: step.status
        });
      });
    }

    return steps;
  };

  const handleEditStep = (step: any) => {
    setEditingStep(step);
    setIsEditDialogOpen(true);
  };

  const handleSaveStep = (updatedStep: any) => {
    // Here you would typically update the plan in your state/database
    console.log('Saving step:', updatedStep);
    setIsEditDialogOpen(false);
    setEditingStep(null);
  };

  const handleExecuteStep = (step: any) => {
    if (onExecuteFeature) {
      onExecuteFeature(step);
    }
  };

  const steps = convertPlanToSteps();

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {plan.title || 'Plan de développement'}
          </CardTitle>
          {plan.description && (
            <p className="text-muted-foreground">{plan.description}</p>
          )}
        </CardHeader>
      </Card>

      {/* Plan Steps as Shader Cards */}
      {steps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Étapes du plan</h3>
          <PlanStepCards 
            steps={steps}
            onEditStep={handleEditStep}
            onExecuteStep={handleExecuteStep}
          />
        </div>
      )}

      {/* Features Cards */}
      {plan?.features && Array.isArray(plan.features) && plan.features.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fonctionnalités</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plan.features.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{feature.name}</CardTitle>
                    {feature.priority && (
                      <Badge className={getPriorityColor(feature.priority)}>
                        {feature.priority}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                  
                  {feature.sub_features && Array.isArray(feature.sub_features) && feature.sub_features.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Sous-fonctionnalités
                      </h5>
                      <div className="space-y-1">
                        {feature.sub_features.map((subFeature, subIndex) => (
                          <div key={subIndex} className="flex items-center justify-between text-xs">
                            <span>{subFeature.name}</span>
                            {subFeature.priority && (
                              <Badge variant="outline" className="h-4 text-xs">
                                {subFeature.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {onExecuteFeature && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onExecuteFeature(feature)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Exécuter
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pages Table */}
      {plan?.pages && Array.isArray(plan.pages) && plan.pages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pages</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.pages.map((page, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{page.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {page.description}
                    </TableCell>
                    <TableCell>
                      {page.priority && (
                        <Badge className={getPriorityColor(page.priority)}>
                          {page.priority}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {onExecuteFeature && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onExecuteFeature(page)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Steps Table */}
      {plan?.steps && Array.isArray(plan.steps) && plan.steps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Étapes de développement</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étape</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.steps.map((step, index) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-medium">
                      {index + 1}. {step.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {step.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(step.status)}>
                        {step.status === 'pending' && 'En attente'}
                        {step.status === 'in_progress' && 'En cours'}
                        {step.status === 'completed' && 'Terminé'}
                        {step.status === 'error' && 'Erreur'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* Edit Step Dialog */}
      <EditStepDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        step={editingStep}
        onSave={handleSaveStep}
      />
    </div>
  );
};