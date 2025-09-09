import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Eye, Edit, Save, X, FileText, Layout } from 'lucide-react';
import AgentPlan from '@/components/ui/agent-plan';
import { PlanMindmapVisualization } from './PlanMindmapVisualization';

interface Section {
  id: string;
  name: string;
  description: string;
  visualIdentity: string;
  layout: string;
  prompt: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  prompt: string;
  subFeatures?: Feature[];
}

interface Page {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  features: Feature[];
  sections: Section[];
  prompt: string;
}

interface EnhancedPlanData {
  id: string;
  title: string;
  description: string;
  pages: Page[];
  startupPrompt?: {
    initialSetup: string;
    firstSteps: string;
  };
  visualIdentity?: {
    detailedSteps: Array<{
      step: string;
      description: string;
      prompt: string;
      deliverables: string[];
    }>;
  };
}

interface PlanTableViewProps {
  planData: EnhancedPlanData;
  onPlanChange?: (planData: EnhancedPlanData) => void;
  onExecuteFeature?: (feature: any) => void;
  onValidatePlan?: (planData: EnhancedPlanData) => void;
}

export const PlanTableView: React.FC<PlanTableViewProps> = ({
  planData,
  onPlanChange,
  onExecuteFeature,
  onValidatePlan,
}) => {
  const [showMindmap, setShowMindmap] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'mindmap'>('list');

  // Convert enhanced plan structure to AgentPlan tasks format
  const convertToAgentPlanTasks = (data: EnhancedPlanData) => {
    const tasks: any[] = [];
    let taskId = 1;

    // Add startup prompt as first task
    if (data.startupPrompt) {
      tasks.push({
        id: taskId.toString(),
        title: "🚀 Project Initialization",
        description: "Initial project setup and configuration",
        status: "pending",
        priority: "high",
        level: 0,
        dependencies: [],
        prompt: `${data.startupPrompt.initialSetup}\n\n${data.startupPrompt.firstSteps}`,
        subtasks: []
      });
      taskId++;
    }

    // Add visual identity as early task
    if (data.visualIdentity?.detailedSteps) {
      tasks.push({
        id: taskId.toString(),
        title: "🎨 Visual Identity Development",
        description: "Complete visual identity and branding creation",
        status: "pending",
        priority: "high",
        level: 0,
        dependencies: data.startupPrompt ? ["1"] : [],
        prompt: "Create the complete visual identity for the project including branding, colors, typography, and visual guidelines.",
        subtasks: data.visualIdentity.detailedSteps.map((step, index) => ({
          id: `${taskId}.${index + 1}`,
          title: step.step,
          description: step.description,
          status: "pending",
          priority: "medium",
          prompt: step.prompt,
          tools: step.deliverables
        }))
      });
      taskId++;
    }

    // Add pages and their features/sections
    data.pages.forEach((page, pageIndex) => {
      const pageTaskId = taskId.toString();
      
      // Create page task
      const pageTask = {
        id: pageTaskId,
        title: `📄 ${page.name} Page`,
        description: page.description,
        status: "pending",
        priority: page.priority,
        level: 0,
        dependencies: data.visualIdentity ? [taskId - 1].map(String) : [],
        prompt: page.prompt,
        subtasks: [] as any[]
      };

      // Add sections as subtasks
      page.sections.forEach((section, sectionIndex) => {
        pageTask.subtasks.push({
          id: `${pageTaskId}.s${sectionIndex + 1}`,
          title: `📐 Section: ${section.name}`,
          description: `${section.description} | Visual: ${section.visualIdentity} | Layout: ${section.layout}`,
          status: "pending",
          priority: "medium",
          prompt: section.prompt,
          tools: ["layout", "styling", "components"]
        });
      });

      // Add features as subtasks
      page.features.forEach((feature, featureIndex) => {
        const featureSubtask = {
          id: `${pageTaskId}.f${featureIndex + 1}`,
          title: `⚡ Feature: ${feature.name}`,
          description: feature.description,
          status: "pending",
          priority: feature.priority,
          prompt: feature.prompt,
          tools: ["development", "testing"]
        };

        pageTask.subtasks.push(featureSubtask);

        // Add sub-features if they exist
        if (feature.subFeatures && feature.subFeatures.length > 0) {
          feature.subFeatures.forEach((subFeature, subIndex) => {
            pageTask.subtasks.push({
              id: `${pageTaskId}.f${featureIndex + 1}.${subIndex + 1}`,
              title: `  └─ ${subFeature.name}`,
              description: subFeature.description,
              status: "pending",
              priority: subFeature.priority,
              prompt: subFeature.prompt,
              tools: ["development"]
            });
          });
        }
      });

      tasks.push(pageTask);
      taskId++;
    });

    return tasks;
  };

  const agentPlanTasks = convertToAgentPlanTasks(planData);

  const handleTasksChange = (updatedTasks: any[]) => {
    // Convert back to enhanced plan structure if needed
    // For now, we'll just trigger onPlanChange with the current planData
    onPlanChange?.(planData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full h-full bg-background">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{planData.title}</h2>
            <p className="text-muted-foreground">{planData.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'list' ? 'default' : 'outline'}
              onClick={() => setCurrentView('list')}
            >
              <FileText className="h-4 w-4 mr-2" />
              List View
            </Button>
            <Button
              variant={currentView === 'mindmap' ? 'default' : 'outline'}
              onClick={() => setCurrentView('mindmap')}
            >
              <Layout className="h-4 w-4 mr-2" />
              Mindmap
            </Button>
            {onValidatePlan && (
              <Button onClick={() => onValidatePlan(planData)} className="ml-4">
                Validate & Execute Plan
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>📄 {planData.pages.length} Pages</span>
          <span>⚡ {planData.pages.reduce((acc, page) => acc + page.features.length, 0)} Features</span>
          <span>📐 {planData.pages.reduce((acc, page) => acc + page.sections.length, 0)} Sections</span>
          <span>📋 {agentPlanTasks.length} Main Tasks</span>
        </div>
      </div>

      {currentView === 'list' ? (
        <div className="flex-1 overflow-auto">
          <AgentPlan
            tasks={agentPlanTasks}
            onTasksChange={handleTasksChange}
            editable={true}
          />
        </div>
      ) : (
        <div className="flex-1 p-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold mb-6">Project Structure Overview</h3>
            
            <div className="space-y-8">
              {planData.pages.map((page, pageIndex) => (
                <div key={page.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {pageIndex + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{page.name}</h4>
                        <p className="text-muted-foreground text-sm">{page.description}</p>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(page.priority)}>
                      {page.priority}
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Features */}
                    <div>
                      <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        ⚡ Features ({page.features.length})
                      </h5>
                      <div className="space-y-3">
                        {page.features.map((feature) => (
                          <div key={feature.id} className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-sm">{feature.name}</h6>
                              <Badge variant="outline" className={getPriorityColor(feature.priority)}>
                                {feature.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{feature.description}</p>
                            
                            {feature.subFeatures && feature.subFeatures.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {feature.subFeatures.map((subFeature) => (
                                  <div key={subFeature.id} className="text-xs text-muted-foreground">
                                    • {subFeature.name}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {onExecuteFeature && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => onExecuteFeature(feature)}
                              >
                                Execute
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sections */}
                    <div>
                      <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        📐 Sections ({page.sections.length})
                      </h5>
                      <div className="space-y-3">
                        {page.sections.map((section) => (
                          <div key={section.id} className="bg-muted/50 rounded-lg p-3">
                            <h6 className="font-medium text-sm mb-2">{section.name}</h6>
                            <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
                            <div className="text-xs space-y-1">
                              <div><strong>Visual:</strong> {section.visualIdentity}</div>
                              <div><strong>Layout:</strong> {section.layout}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mindmap Modal */}
      {showMindmap && (
        <PlanMindmapVisualization
          isOpen={showMindmap}
          onClose={() => setShowMindmap(false)}
          data={{
            ...planData,
            mainIdea: planData.description,
            productSummary: planData.description,
            technicalDocumentation: [],
            roadmap: [],
            features: planData.pages.flatMap(p => p.features),
            marketStudy: { targetAudience: "", competitors: [] }
          }}
          onExecuteFeature={onExecuteFeature}
        />
      )}
    </div>
  );
};

export default PlanTableView;