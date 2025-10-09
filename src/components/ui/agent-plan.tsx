"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[];
  prompt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
  prompt?: string;
}

export interface AgentPlanProps {
  tasks?: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, newStatus: string) => void;
}

export default function AgentPlan({ 
  tasks: externalTasks,
  onTaskStatusChange,
  onSubtaskStatusChange
}: AgentPlanProps) {
  const [tasks, setTasks] = useState<Task[]>(externalTasks || []);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(tasks.length > 0 ? [tasks[0].id] : []);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});

  React.useEffect(() => {
    if (externalTasks) {
      setTasks(externalTasks);
    }
  }, [externalTasks]);

  const prefersReducedMotion = 
    typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleTaskStatus = (taskId: string) => {
    const statuses = ["completed", "in-progress", "pending", "need-help", "failed"];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const currentIndex = statuses.indexOf(task.status);
    const newStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((subtask) => ({
            ...subtask,
            status: newStatus === "completed" ? "completed" : subtask.status,
          }));

          return {
            ...task,
            status: newStatus,
            subtasks: updatedSubtasks,
          };
        }
        return task;
      }),
    );
    
    onTaskStatusChange?.(taskId, newStatus);
  };

  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((subtask) => {
            if (subtask.id === subtaskId) {
              const newStatus =
                subtask.status === "completed" ? "pending" : "completed";
              onSubtaskStatusChange?.(taskId, subtaskId, newStatus);
              return { ...subtask, status: newStatus };
            }
            return subtask;
          });

          const allSubtasksCompleted = updatedSubtasks.every(
            (s) => s.status === "completed",
          );

          return {
            ...task,
            subtasks: updatedSubtasks,
            status: allSubtasksCompleted ? "completed" : task.status,
          };
        }
        return task;
      }),
    );
  };

  const taskVariants = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : -5 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: prefersReducedMotion ? ("tween" as const) : ("spring" as const),
        stiffness: 500, 
        damping: 30,
        duration: prefersReducedMotion ? 0.2 : undefined
      }
    },
    exit: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -5,
      transition: { duration: 0.15 }
    }
  };

  const subtaskListVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      overflow: "hidden" as const
    },
    visible: { 
      height: "auto", 
      opacity: 1,
      overflow: "visible" as const,
      transition: { 
        duration: 0.25, 
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren" as const,
        ease: [0.2, 0.65, 0.3, 0.9] as const
      }
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden" as const,
      transition: { 
        duration: 0.2,
        ease: [0.2, 0.65, 0.3, 0.9] as const
      }
    }
  };

  const subtaskVariants = {
    hidden: { 
      opacity: 0, 
      x: prefersReducedMotion ? 0 : -10 
    },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: prefersReducedMotion ? ("tween" as const) : ("spring" as const),
        stiffness: 500, 
        damping: 25,
        duration: prefersReducedMotion ? 0.2 : undefined
      }
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : -10,
      transition: { duration: 0.15 }
    }
  };

  const subtaskDetailsVariants = {
    hidden: { 
      opacity: 0, 
      height: 0,
      overflow: "hidden" as const
    },
    visible: { 
      opacity: 1, 
      height: "auto",
      overflow: "visible" as const,
      transition: { 
        duration: 0.25,
        ease: [0.2, 0.65, 0.3, 0.9] as const
      }
    }
  };

  const statusBadgeVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: prefersReducedMotion ? 1 : [1, 1.08, 1],
      transition: { 
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1] as const
      }
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-background text-foreground h-full overflow-auto p-2">
        <div className="bg-card border-border rounded-lg border shadow p-8 text-center">
          <p className="text-muted-foreground">Aucune tâche à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground h-full overflow-auto p-2">
      <motion.div 
        className="bg-card border-border rounded-lg border shadow overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.3,
            ease: [0.2, 0.65, 0.3, 0.9]
          }
        }}
      >
        <LayoutGroup>
          <div className="p-4 overflow-hidden">
            <ul className="space-y-1 overflow-hidden">
              {tasks.map((task, index) => {
                const isExpanded = expandedTasks.includes(task.id);
                const isCompleted = task.status === "completed";

                return (
                  <motion.li
                    key={task.id}
                    className={` ${index !== 0 ? "mt-1 pt-2" : ""} `}
                    initial="hidden"
                    animate="visible"
                    variants={taskVariants}
                  >
                    <motion.div 
                      className="group flex items-center px-3 py-1.5 rounded-md"
                      whileHover={{ 
                        backgroundColor: "rgba(0,0,0,0.03)",
                        transition: { duration: 0.2 }
                      }}
                    >
                      <motion.div
                        className="mr-2 flex-shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskStatus(task.id);
                        }}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={task.status}
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                            transition={{
                              duration: 0.2,
                              ease: [0.2, 0.65, 0.3, 0.9]
                            }}
                          >
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                            ) : task.status === "in-progress" ? (
                              <CircleDotDashed className="h-4.5 w-4.5 text-blue-500" />
                            ) : task.status === "need-help" ? (
                              <CircleAlert className="h-4.5 w-4.5 text-yellow-500" />
                            ) : task.status === "failed" ? (
                              <CircleX className="h-4.5 w-4.5 text-red-500" />
                            ) : (
                              <Circle className="text-muted-foreground h-4.5 w-4.5" />
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      <motion.div
                        className="flex min-w-0 flex-grow cursor-pointer items-center justify-between"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        <div className="mr-2 flex-1 truncate">
                          <span
                            className={`${isCompleted ? "text-muted-foreground line-through" : ""}`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex flex-shrink-0 items-center space-x-2 text-xs">
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="flex items-center mr-2">
                              <div className="flex flex-wrap gap-1">
                                {task.dependencies.map((dep, idx) => (
                                  <motion.span
                                    key={idx}
                                    className="bg-secondary/40 text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: idx * 0.05
                                    }}
                                    whileHover={{ 
                                      y: -1, 
                                      backgroundColor: "rgba(0,0,0,0.1)",
                                      transition: { duration: 0.2 } 
                                    }}
                                  >
                                    {dep}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}

                          <motion.span
                            className={`rounded px-1.5 py-0.5 ${
                              task.status === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : task.status === "in-progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : task.status === "need-help"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : task.status === "failed"
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-muted text-muted-foreground"
                            }`}
                            variants={statusBadgeVariants}
                            initial="initial"
                            animate="animate"
                            key={task.status}
                          >
                            {task.status}
                          </motion.span>
                        </div>
                      </motion.div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                      {isExpanded && (
                        <motion.div 
                          className="relative overflow-hidden"
                          variants={subtaskListVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          layout
                        >
                          {task.prompt && (
                            <div className="mx-3 my-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                              <span className="font-semibold">Prompt: </span>
                              {task.prompt}
                            </div>
                          )}
                          
                          {task.subtasks.length > 0 && (
                            <>
                              <div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-muted-foreground/30" />
                              <ul className="border-muted mt-1 mr-2 mb-1.5 ml-3 space-y-0.5">
                                {task.subtasks.map((subtask) => {
                                  const subtaskKey = `${task.id}-${subtask.id}`;
                                  const isSubtaskExpanded = expandedSubtasks[subtaskKey];

                                  return (
                                    <motion.li
                                      key={subtask.id}
                                      className="group flex flex-col py-0.5 pl-6"
                                      onClick={() =>
                                        toggleSubtaskExpansion(task.id, subtask.id)
                                      }
                                      variants={subtaskVariants}
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                      layout
                                    >
                                      <motion.div 
                                        className="flex flex-1 items-center rounded-md p-1"
                                        whileHover={{ 
                                          backgroundColor: "rgba(0,0,0,0.03)",
                                          transition: { duration: 0.2 }
                                        }}
                                        layout
                                      >
                                        <motion.div
                                          className="mr-2 flex-shrink-0 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSubtaskStatus(task.id, subtask.id);
                                          }}
                                          whileTap={{ scale: 0.9 }}
                                          whileHover={{ scale: 1.1 }}
                                          layout
                                        >
                                          <AnimatePresence mode="wait">
                                            <motion.div
                                              key={subtask.status}
                                              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                              animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                              exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                                              transition={{
                                                duration: 0.2,
                                                ease: [0.2, 0.65, 0.3, 0.9]
                                              }}
                                            >
                                              {subtask.status === "completed" ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                              ) : subtask.status === "in-progress" ? (
                                                <CircleDotDashed className="h-3.5 w-3.5 text-blue-500" />
                                              ) : subtask.status === "need-help" ? (
                                                <CircleAlert className="h-3.5 w-3.5 text-yellow-500" />
                                              ) : subtask.status === "failed" ? (
                                                <CircleX className="h-3.5 w-3.5 text-red-500" />
                                              ) : (
                                                <Circle className="text-muted-foreground h-3.5 w-3.5" />
                                              )}
                                            </motion.div>
                                          </AnimatePresence>
                                        </motion.div>

                                        <span
                                          className={`cursor-pointer text-sm ${subtask.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                                        >
                                          {subtask.title}
                                        </span>
                                      </motion.div>

                                      <AnimatePresence mode="wait">
                                        {isSubtaskExpanded && (
                                          <motion.div 
                                            className="text-muted-foreground border-foreground/20 mt-1 ml-1.5 border-l border-dashed pl-5 text-xs overflow-hidden"
                                            variants={subtaskDetailsVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="hidden"
                                            layout
                                          >
                                            <p className="py-1">{subtask.description}</p>
                                            
                                            {subtask.prompt && (
                                              <div className="my-1 p-1.5 bg-muted/50 rounded">
                                                <span className="font-semibold">Prompt: </span>
                                                {subtask.prompt}
                                              </div>
                                            )}
                                            
                                            {subtask.tools && subtask.tools.length > 0 && (
                                              <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-1.5">
                                                <span className="text-muted-foreground font-medium">
                                                  MCP Servers:
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                  {subtask.tools.map((tool, idx) => (
                                                    <motion.span
                                                      key={idx}
                                                      className="bg-secondary/40 text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm"
                                                      initial={{ opacity: 0, y: -5 }}
                                                      animate={{ 
                                                        opacity: 1, 
                                                        y: 0,
                                                        transition: {
                                                          duration: 0.2,
                                                          delay: idx * 0.05
                                                        }
                                                      }}
                                                      whileHover={{ 
                                                        y: -1, 
                                                        backgroundColor: "rgba(0,0,0,0.1)",
                                                        transition: { duration: 0.2 } 
                                                      }}
                                                    >
                                                      {tool}
                                                    </motion.span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.li>
                                  );
                                })}
                              </ul>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}
