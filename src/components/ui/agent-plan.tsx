"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
  Edit,
  Save,
  X,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Input } from "./input";

// Type definitions
interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  prompt?: string;
  tools?: string[];
}

interface Task {
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

interface AgentPlanProps {
  tasks: Task[];
  onTasksChange?: (tasks: Task[]) => void;
  editable?: boolean;
}

export default function AgentPlan({ tasks: initialTasks, onTasksChange, editable = false }: AgentPlanProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(["1"]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{
    [key: string]: boolean;
  }>({});
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  // Add support for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  // Toggle subtask expansion
  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle task status
  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        const statuses = ["pending", "in-progress", "completed", "need-help", "failed"];
        const currentIndex = statuses.indexOf(task.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const newStatus = statuses[nextIndex];

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
    });
    
    setTasks(updatedTasks);
    onTasksChange?.(updatedTasks);
  };

  // Toggle subtask status
  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map((subtask) => {
          if (subtask.id === subtaskId) {
            const statuses = ["pending", "in-progress", "completed", "need-help", "failed"];
            const currentIndex = statuses.indexOf(subtask.status);
            const nextIndex = (currentIndex + 1) % statuses.length;
            return { ...subtask, status: statuses[nextIndex] };
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
    });
    
    setTasks(updatedTasks);
    onTasksChange?.(updatedTasks);
  };

  // Start editing task
  const startEditingTask = (task: Task) => {
    setEditingTask(task.id);
    setEditValues({
      title: task.title,
      description: task.description,
      prompt: task.prompt || '',
    });
  };

  // Start editing subtask
  const startEditingSubtask = (taskId: string, subtask: Subtask) => {
    setEditingSubtask(`${taskId}-${subtask.id}`);
    setEditValues({
      title: subtask.title,
      description: subtask.description,
      prompt: subtask.prompt || '',
    });
  };

  // Save task edit
  const saveTaskEdit = (taskId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          title: editValues.title,
          description: editValues.description,
          prompt: editValues.prompt,
        };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    onTasksChange?.(updatedTasks);
    setEditingTask(null);
    setEditValues({});
  };

  // Save subtask edit
  const saveSubtaskEdit = (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map((subtask) => {
          if (subtask.id === subtaskId) {
            return {
              ...subtask,
              title: editValues.title,
              description: editValues.description,
              prompt: editValues.prompt,
            };
          }
          return subtask;
        });
        return { ...task, subtasks: updatedSubtasks };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    onTasksChange?.(updatedTasks);
    setEditingSubtask(null);
    setEditValues({});
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingTask(null);
    setEditingSubtask(null);
    setEditValues({});
  };

  // Animation variants with reduced motion support
  const taskVariants = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : -5 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.2
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
      overflow: "hidden" 
    },
    visible: { 
      height: "auto", 
      opacity: 1,
      overflow: "visible",
      transition: { 
        duration: 0.25, 
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        when: "beforeChildren"
      }
    },
    exit: {
      height: 0,
      opacity: 0,
      overflow: "hidden",
      transition: { 
        duration: 0.2
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
        duration: 0.2
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
      overflow: "hidden"
    },
    visible: { 
      opacity: 1, 
      height: "auto",
      overflow: "visible",
      transition: { 
        duration: 0.25
      }
    }
  };

  const statusBadgeVariants = {
    initial: { scale: 1 },
    animate: { 
      scale: prefersReducedMotion ? 1 : [1, 1.08, 1],
      transition: { 
        duration: 0.35
      }
    }
  };

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
                const isEditingThisTask = editingTask === task.id;

                return (
                  <motion.li
                    key={task.id}
                    className={` ${index !== 0 ? "mt-1 pt-2" : ""} `}
                    initial="hidden"
                    animate="visible"
                    variants={taskVariants}
                  >
                    {/* Task row */}
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

                      {isEditingThisTask ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            value={editValues.title}
                            onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                            placeholder="Task title"
                          />
                          <Textarea
                            value={editValues.description}
                            onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                            placeholder="Task description"
                            rows={2}
                          />
                          <Textarea
                            value={editValues.prompt}
                            onChange={(e) => setEditValues({...editValues, prompt: e.target.value})}
                            placeholder="Execution prompt"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveTaskEdit(task.id)}>
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
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
                            {editable && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingTask(task);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}

                            {task.dependencies.length > 0 && (
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
                                  ? "bg-green-100 text-green-700"
                                  : task.status === "in-progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : task.status === "need-help"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : task.status === "failed"
                                        ? "bg-red-100 text-red-700"
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
                      )}
                    </motion.div>

                    {/* Task prompt display when expanded */}
                    <AnimatePresence mode="wait">
                      {isExpanded && task.prompt && !isEditingThisTask && (
                        <motion.div
                          className="mx-8 mt-2 p-3 bg-muted/50 rounded-md"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className="text-xs font-medium text-muted-foreground mb-1">Execution Prompt:</div>
                          <div className="text-sm whitespace-pre-wrap">{task.prompt}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Subtasks */}
                    <AnimatePresence mode="wait">
                      {isExpanded && task.subtasks.length > 0 && (
                        <motion.div 
                          className="relative overflow-hidden"
                          variants={subtaskListVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          layout
                        >
                          <div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-muted-foreground/30" />
                          <ul className="border-muted mt-1 mr-2 mb-1.5 ml-3 space-y-0.5">
                            {task.subtasks.map((subtask) => {
                              const subtaskKey = `${task.id}-${subtask.id}`;
                              const isSubtaskExpanded = expandedSubtasks[subtaskKey];
                              const isEditingThisSubtask = editingSubtask === subtaskKey;

                              return (
                                <motion.li
                                  key={subtask.id}
                                  className="group flex flex-col py-0.5 pl-6"
                                  variants={subtaskVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  layout
                                >
                                  {isEditingThisSubtask ? (
                                    <div className="space-y-2 p-2 bg-muted/30 rounded-md">
                                      <Input
                                        value={editValues.title}
                                        onChange={(e) => setEditValues({...editValues, title: e.target.value})}
                                        placeholder="Subtask title"
                                      />
                                      <Textarea
                                        value={editValues.description}
                                        onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                                        placeholder="Subtask description"
                                        rows={2}
                                      />
                                      <Textarea
                                        value={editValues.prompt}
                                        onChange={(e) => setEditValues({...editValues, prompt: e.target.value})}
                                        placeholder="Execution prompt"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={() => saveSubtaskEdit(task.id, subtask.id)}>
                                          <Save className="h-3 w-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <motion.div 
                                        className="flex flex-1 items-center rounded-md p-1"
                                        onClick={() => toggleSubtaskExpansion(task.id, subtask.id)}
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

                                        <div className="flex-1 flex items-center justify-between">
                                          <span
                                            className={`cursor-pointer text-sm ${subtask.status === "completed" ? "text-muted-foreground line-through" : ""}`}
                                          >
                                            {subtask.title}
                                          </span>
                                          
                                          {editable && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingSubtask(task.id, subtask);
                                              }}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
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
                                              <div className="mt-2 p-2 bg-muted/50 rounded">
                                                <div className="font-medium mb-1">Execution Prompt:</div>
                                                <div className="whitespace-pre-wrap">{subtask.prompt}</div>
                                              </div>
                                            )}
                                            
                                            {subtask.tools && subtask.tools.length > 0 && (
                                              <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-1.5">
                                                <span className="text-muted-foreground font-medium">
                                                  Tools:
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
                                    </>
                                  )}
                                </motion.li>
                              );
                            })}
                          </ul>
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