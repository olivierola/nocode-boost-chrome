import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AgentPlan, { Task } from "@/components/ui/agent-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface AgentExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  projectId?: string;
}

export default function AgentExecutionDialog({
  open,
  onOpenChange,
  initialPrompt = "",
  projectId,
}: AgentExecutionDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleGeneratePlan = async () => {
    if (!prompt.trim()) {
      toast.error("Veuillez entrer un prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('plan-agent', {
        body: {
          action: 'generate',
          prompt: prompt.trim(),
          projectId
        }
      });

      if (error) throw error;

      if (data?.plan?.tasks) {
        // Convert plan tasks to AgentPlan format
        const convertedTasks: Task[] = data.plan.tasks.map((task: any, index: number) => ({
          id: String(index + 1),
          title: task.title,
          description: task.description || "",
          status: "pending",
          priority: task.priority || "medium",
          level: 0,
          dependencies: [],
          prompt: task.prompt,
          subtasks: (task.subtasks || []).map((subtask: any, subIndex: number) => ({
            id: `${index + 1}.${subIndex + 1}`,
            title: subtask.title,
            description: subtask.description || "",
            status: "pending",
            priority: subtask.priority || "medium",
            tools: subtask.tools || [],
            prompt: subtask.prompt,
          }))
        }));
        
        setTasks(convertedTasks);
        toast.success("Plan généré avec succès");
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error("Erreur lors de la génération du plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecutePlan = async () => {
    if (tasks.length === 0) {
      toast.error("Aucune tâche à exécuter");
      return;
    }

    setIsExecuting(true);
    try {
      // Execute tasks sequentially
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        // Update task status to in-progress
        setTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: "in-progress" } : t
        ));

        const { data, error } = await supabase.functions.invoke('plan-agent', {
          body: {
            action: 'execute',
            taskId: task.id,
            prompt: task.prompt || task.title,
            projectId
          }
        });

        if (error) {
          setTasks(prev => prev.map(t => 
            t.id === task.id ? { ...t, status: "failed" } : t
          ));
          throw error;
        }

        // Update task status to completed
        setTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, status: "completed" } : t
        ));

        // Small delay between tasks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success("Toutes les tâches ont été exécutées");
    } catch (error) {
      console.error('Error executing plan:', error);
      toast.error("Erreur lors de l'exécution du plan");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setTasks([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agent d'Exécution AI</DialogTitle>
          <DialogDescription>
            Entrez un prompt pour générer un plan d'action que l'agent AI exécutera
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Prompt Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              placeholder="Décrivez ce que vous voulez que l'agent fasse..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
              disabled={isGenerating || isExecuting}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleGeneratePlan}
                disabled={isGenerating || isExecuting || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Générer le Plan
                  </>
                )}
              </Button>
              {tasks.length > 0 && (
                <>
                  <Button
                    onClick={handleExecutePlan}
                    disabled={isGenerating || isExecuting}
                    variant="default"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exécution...
                      </>
                    ) : (
                      "Exécuter"
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    disabled={isGenerating || isExecuting}
                    variant="outline"
                  >
                    Réinitialiser
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Agent Plan Display */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            <AgentPlan
              tasks={tasks}
              onTaskStatusChange={(taskId, newStatus) => {
                console.log(`Task ${taskId} status changed to ${newStatus}`);
              }}
              onSubtaskStatusChange={(taskId, subtaskId, newStatus) => {
                console.log(`Subtask ${subtaskId} of task ${taskId} status changed to ${newStatus}`);
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
