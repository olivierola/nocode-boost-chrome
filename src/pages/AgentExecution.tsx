import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import AgentPlan, { Task } from "@/components/ui/agent-plan";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lightbulb, Send } from "lucide-react";
import { useProjectContext } from "@/hooks/useProjectContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentExecution() {
  const [suggestion, setSuggestion] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { selectedProject } = useProjectContext();

  // Load execution tasks from current plan
  useEffect(() => {
    if (selectedProject) {
      loadExecutionTasks();
    }
  }, [selectedProject]);

  const loadExecutionTasks = async () => {
    if (!selectedProject) return;

    try {
      // Load current plan
      const { data: plan, error } = await supabase
        .from('plans')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const planData = plan?.plan_data as any;
      if (planData?.plan_implementation) {
        // Convert implementation steps to AgentPlan tasks
        const steps = planData.plan_implementation;
        const convertedTasks: Task[] = Array.isArray(steps) ? steps.map((step: any, index: number) => ({
          id: String(index + 1),
          title: step.titre || `Étape ${index + 1}`,
          description: step.description || "",
          status: step.status || "pending",
          priority: "medium",
          level: 0,
          dependencies: [],
          prompt: step.prompt_optimise || step.prompt || "",
          subtasks: []
        })) : [];
        
        setTasks(convertedTasks);
      }
    } catch (error) {
      console.error('Error loading execution tasks:', error);
    }
  };

  const handleSendSuggestion = async () => {
    if (!suggestion.trim()) {
      toast.error("Veuillez entrer une suggestion");
      return;
    }

    setIsSending(true);
    try {
      // Send suggestion to agent to integrate in process
      const { data, error } = await supabase.functions.invoke('plan-agent', {
        body: {
          action: 'monitor_progress',
          planData: { tasks },
          currentStep: tasks.find(t => t.status === "in-progress"),
          suggestion: suggestion.trim(),
          projectId: selectedProject?.id
        }
      });

      if (error) throw error;

      toast.success("Suggestion envoyée à l'agent IA");
      setSuggestion("");
    } catch (error) {
      console.error('Error sending suggestion:', error);
      toast.error("Erreur lors de l'envoi de la suggestion");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-6 overflow-hidden">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle>Agent d'Exécution AI</CardTitle>
              <CardDescription>
                Suivez la progression de l'exécution des tâches avec animations en temps réel
              </CardDescription>
            </div>
            <Badge variant={isExecuting ? "default" : "outline"} className="animate-pulse">
              {isExecuting ? "En cours" : "En attente"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Suggestion Input Section */}
      <Card className="flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Suggérer une idée à l'agent
          </CardTitle>
          <CardDescription className="text-xs">
            L'agent intégrera votre suggestion dans le processus d'exécution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              placeholder="Ex: Ajoute une validation côté client pour améliorer l'UX..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              className="min-h-[80px]"
              disabled={isSending}
            />
            <Button
              onClick={handleSendSuggestion}
              disabled={isSending || !suggestion.trim()}
              className="w-full"
              size="sm"
            >
              {isSending ? (
                <>
                  <Send className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer la suggestion
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agent Plan Display - Execution Progress */}
      <div className="flex-1 overflow-hidden border rounded-lg bg-card">
        {tasks.length > 0 ? (
          <AgentPlan
            tasks={tasks}
            onTaskStatusChange={(taskId, newStatus) => {
              setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: newStatus } : t
              ));
            }}
            onSubtaskStatusChange={(taskId, subtaskId, newStatus) => {
              setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                  return {
                    ...t,
                    subtasks: t.subtasks.map(st =>
                      st.id === subtaskId ? { ...st, status: newStatus } : st
                    )
                  };
                }
                return t;
              }));
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">Aucune tâche en cours</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Les tâches de la timeline apparaîtront ici avec leur progression en temps réel
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
