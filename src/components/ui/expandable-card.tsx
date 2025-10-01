"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Plus, Trash2, Code, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExpandable } from "@/hooks/use-expandable";

interface ComponentCardProps {
  id: string;
  title: string;
  description?: string | null;
  prompt?: string | null;
  type?: string;
  created_at?: string;
  onCopy?: () => void;
  onAddToPrompt?: () => void;
  onDelete?: () => void;
}

export function ComponentCard({
  id,
  title,
  description,
  prompt,
  type = "component",
  created_at,
  onCopy,
  onAddToPrompt,
  onDelete,
}: ComponentCardProps) {
  const { isExpanded, toggleExpand, animatedHeight } = useExpandable();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      animatedHeight.set(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, animatedHeight]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card
      className="w-full cursor-pointer transition-all duration-300 hover:shadow-lg"
      onClick={toggleExpand}
    >
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-start w-full">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {type === "font" ? "Police" : type === "file" ? "Fichier" : "Composant"}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <motion.div
          style={{ height: animatedHeight }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="overflow-hidden"
        >
          <div ref={contentRef}>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 pt-2"
                >
                  {prompt && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <h4 className="font-medium text-sm">Prompt</h4>
                      </div>
                      <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                        {prompt}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {onCopy && prompt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy();
                        }}
                        className="flex-1"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copier
                      </Button>
                    )}
                    {onAddToPrompt && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPrompt();
                        }}
                        className="flex-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </CardContent>

      <CardFooter>
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <span>{formatDate(created_at)}</span>
          <span className="text-primary">{isExpanded ? "Cliquer pour réduire" : "Cliquer pour voir plus"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
