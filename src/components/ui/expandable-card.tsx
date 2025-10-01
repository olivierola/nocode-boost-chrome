"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Plus, Trash2, Code, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExpandable } from "@/hooks/use-expandable";
import { cn } from "@/lib/utils";

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

  const getTypeLabel = () => {
    if (type === "font") return "Police";
    if (type === "file") return "Fichier";
    return "Composant";
  };

  return (
    <div
      className={cn(
        "w-full",
        "bg-card",
        "border border-border",
        "rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
      )}
    >
      <div className="p-6">
        {/* Header section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {getTypeLabel()}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(created_at)}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-4">
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

        {/* Expandable prompt section */}
        {prompt && (
          <>
            <button
              type="button"
              onClick={toggleExpand}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Voir le prompt</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

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
                      className="pt-3"
                    >
                      <div className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto">
                        {prompt}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
