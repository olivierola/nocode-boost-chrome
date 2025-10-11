"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useProjectContext } from "@/hooks/useProjectContext";

interface Task {
  id: number;
  title: string;
  status: "pending" | "running" | "completed";
  substeps?: Subtask[];
}

interface Subtask {
  id: number;
  title: string;
  status: "pending" | "running" | "completed";
}

export function AIAgentBox() {
  const { selectedProject } = useProjectContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);

  const [input, setInput] = useState("");
  const [pulsePhase, setPulsePhase] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load plan steps from database
  useEffect(() => {
    const loadPlanSteps = async () => {
      if (!selectedProject) {
        setLoading(false);
        return;
      }

      try {
        const { data: plans, error } = await supabase
          .from("plans")
          .select("*")
          .eq("project_id", selectedProject.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;

        if (plans && plans.length > 0) {
          const plan = plans[0];
          const planData = (plan.plan_data as any)?.plan_data;

          if (planData?.plan_implementation) {
            const steps = planData.plan_implementation.map((step: any, index: number) => ({
              id: index + 1,
              title: step.nom || step.title || `Étape ${index + 1}`,
              status: index === 0 ? "running" : ("pending" as const),
              substeps: step.substeps || [],
            }));

            setTasks(steps);

            // Set subtasks from the first running task
            if (steps[0]?.substeps) {
              const mappedSubtasks = steps[0].substeps.map((sub: any, idx: number) => ({
                id: idx + 1,
                title: sub.description || sub.title || sub,
                status: idx < 2 ? "completed" : idx === 2 ? "running" : ("pending" as const),
              }));
              setSubtasks(mappedSubtasks);
            }
          }
        }
      } catch (error) {
        console.error("Error loading plan steps:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPlanSteps();
  }, [selectedProject]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 3);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSendIdea = () => {
    if (input.trim()) {
      const newTask: Task = {
        id: tasks.length + 1,
        title: input.trim(),
        status: "pending",
      };
      setTasks([...tasks, newTask]);
      setInput("");
    }
  };

  const currentTask = tasks.find((t) => t.status === "running");

  return (
    <div className="w-[300px] h-[200px] bg-zinc-900 rounded-lg border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
      {/* Agent Status Header */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <div className="flex gap-0.5 ml-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full transition-all duration-300 ${
                    pulsePhase === i ? "bg-blue-400 scale-125" : "bg-zinc-600"
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-xs font-medium text-zinc-300">AI Agent</span>
        </div>
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-500">Chargement...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-zinc-500">Aucun plan en cours</p>
          </div>
        ) : null}

        {!loading && currentTask && (
          <div className="bg-zinc-800/50 rounded border border-zinc-700 p-2 mb-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 leading-relaxed break-words">{currentTask.title}</p>
              </div>
            </div>
          </div>
        )}

        {currentTask && subtasks.length > 0 && (
          <div className="mb-2 max-h-[60px] overflow-y-auto scrollbar-hide">
            <div className="space-y-1">
              {subtasks.map((subtask, index) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/20 rounded border border-zinc-800/50 animate-slide-in-fade"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {subtask.status === "completed" ? (
                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500/70 flex-shrink-0" />
                  ) : subtask.status === "running" ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full border border-zinc-600 flex-shrink-0" />
                  )}
                  <p
                    className={`text-[10px] leading-tight break-words ${
                      subtask.status === "completed"
                        ? "text-zinc-500 line-through"
                        : subtask.status === "running"
                          ? "text-zinc-300"
                          : "text-zinc-600"
                    }`}
                  >
                    {subtask.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {tasks
            .filter((t) => t.status === "pending")
            .slice(0, 2)
            .map((task, index) => (
              <div
                key={task.id}
                className="bg-zinc-800/30 rounded border border-zinc-800 px-2 py-1.5 animate-slide-in-fade"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <p className="text-[10px] text-zinc-500 leading-relaxed break-words">{task.title}</p>
              </div>
            ))}
        </div>
      </div>

      <div className="px-2.5 py-2.5 border-t border-zinc-800 bg-zinc-950/80">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendIdea()}
              placeholder="Suggest an idea..."
              className="h-8 text-xs bg-zinc-800/80 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 transition-all rounded-md pr-2"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSendIdea}
            className="h-8 w-8 p-0 hover:bg-blue-500 transition-all shadow-sm hover:shadow-blue-500/20 text-foreground bg-border rounded-full"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
