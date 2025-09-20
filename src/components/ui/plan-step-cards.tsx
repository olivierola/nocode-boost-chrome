"use client"

import React, { useState } from 'react'
import { Warp } from "@paper-design/shaders-react"
import { ChevronDown, ChevronUp, Edit3, FileText, Code, Shield, Database } from 'lucide-react'
import { Button } from './button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

interface PlanStep {
  id: string
  title: string
  description: string
  prompt?: string
  type: 'documentation' | 'implementation' | 'backend' | 'security'
  status?: 'pending' | 'in-progress' | 'completed' | 'error'
}

interface PlanStepCardsProps {
  steps: PlanStep[]
  onEditStep: (step: PlanStep) => void
  onExecuteStep?: (step: PlanStep) => void
}

export default function PlanStepCards({ steps = [], onEditStep, onExecuteStep }: PlanStepCardsProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const toggleCard = (stepId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'documentation':
        return <FileText className="w-8 h-8" />
      case 'implementation':
        return <Code className="w-8 h-8" />
      case 'backend':
        return <Database className="w-8 h-8" />
      case 'security':
        return <Shield className="w-8 h-8" />
      default:
        return <FileText className="w-8 h-8" />
    }
  }

  const getShaderConfig = (type: string, index: number) => {
    const baseConfigs = {
      documentation: {
        proportion: 0.2,
        softness: 1.5,
        distortion: 0.05,
        swirl: 0.3,
        swirlIterations: 5,
        shape: "stripes" as const,
        shapeScale: 0.15,
        colors: ["hsl(0, 0%, 95%)", "hsl(0, 0%, 100%)", "hsl(0, 0%, 98%)", "hsl(0, 0%, 92%)"],
      },
      implementation: {
        proportion: 0.35,
        softness: 0.9,
        distortion: 0.18,
        swirl: 0.7,
        swirlIterations: 10,
        shape: "checks" as const,
        shapeScale: 0.1,
        colors: ["hsl(220, 100%, 25%)", "hsl(240, 100%, 60%)", "hsl(200, 90%, 30%)", "hsl(230, 100%, 70%)"],
      },
      backend: {
        proportion: 0.4,
        softness: 1.1,
        distortion: 0.2,
        swirl: 0.8,
        swirlIterations: 12,
        shape: "stripes" as const,
        shapeScale: 0.12,
        colors: ["hsl(120, 100%, 25%)", "hsl(140, 100%, 60%)", "hsl(100, 90%, 30%)", "hsl(130, 100%, 70%)"],
      },
      security: {
        proportion: 0.45,
        softness: 1.0,
        distortion: 0.22,
        swirl: 0.85,
        swirlIterations: 15,
        shape: "checks" as const,
        shapeScale: 0.09,
        colors: ["hsl(0, 100%, 35%)", "hsl(20, 100%, 65%)", "hsl(10, 90%, 40%)", "hsl(15, 100%, 75%)"],
      }
    }
    
    return baseConfigs[type as keyof typeof baseConfigs] || baseConfigs.documentation
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'in-progress':
        return 'text-blue-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.isArray(steps) && steps.map((step, index) => {
        const shaderConfig = getShaderConfig(step.type, index)
        const isExpanded = expandedCards.has(step.id)
        const isDocumentation = step.type === 'documentation'
        
        return (
          <Collapsible key={step.id} open={isExpanded} onOpenChange={() => toggleCard(step.id)}>
            <div className="relative h-auto min-h-[300px]">
              {/* Shader Background - only for non-documentation cards */}
              {!isDocumentation && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <Warp
                    style={{ height: "100%", width: "100%" }}
                    proportion={shaderConfig.proportion}
                    softness={shaderConfig.softness}
                    distortion={shaderConfig.distortion}
                    swirl={shaderConfig.swirl}
                    swirlIterations={shaderConfig.swirlIterations}
                    shape={shaderConfig.shape}
                    shapeScale={shaderConfig.shapeScale}
                    scale={1}
                    rotation={0}
                    speed={0.6}
                    colors={shaderConfig.colors}
                  />
                </div>
              )}

              {/* Card Content */}
              <div className={`relative z-10 p-6 rounded-2xl h-full flex flex-col ${
                isDocumentation 
                  ? 'bg-white dark:bg-white border border-gray-200 dark:border-gray-200 text-gray-900' 
                  : 'bg-black/80 border border-white/20 dark:border-white/10 text-white'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`${isDocumentation ? 'text-gray-700' : 'text-white'} filter drop-shadow-lg`}>
                    {getStepIcon(step.type)}
                  </div>
                  <div className="flex items-center gap-2">
                    {step.status && (
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(step.status)}`} />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditStep(step)
                      }}
                      className={`${
                        isDocumentation 
                          ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
                          : 'text-gray-200 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-xl font-bold mb-3 ${
                  isDocumentation ? 'text-gray-900' : 'text-white'
                }`}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className={`leading-relaxed flex-grow ${
                  isDocumentation ? 'text-gray-700' : 'text-gray-100'
                } font-medium text-sm`}>
                  {step.description}
                </p>

                {/* Expand/Collapse Trigger */}
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`mt-4 flex items-center justify-center text-sm font-medium ${
                      isDocumentation 
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2">
                      {isExpanded ? 'Masquer le prompt' : 'Voir le prompt'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                {/* Expandable Content */}
                <CollapsibleContent className="mt-4">
                  <div className={`p-4 rounded-lg ${
                    isDocumentation 
                      ? 'bg-gray-50 border border-gray-200' 
                      : 'bg-white/10 border border-white/20'
                  }`}>
                    <h4 className={`text-sm font-semibold mb-2 ${
                      isDocumentation ? 'text-gray-800' : 'text-white'
                    }`}>
                      Prompt :
                    </h4>
                    <p className={`text-xs leading-relaxed ${
                      isDocumentation ? 'text-gray-600' : 'text-gray-200'
                    }`}>
                      {step.prompt || 'Aucun prompt défini'}
                    </p>
                    
                    {onExecuteStep && (
                      <Button
                        size="sm"
                        onClick={() => onExecuteStep(step)}
                        className={`mt-3 w-full ${
                          isDocumentation 
                            ? 'bg-gray-900 text-white hover:bg-gray-800' 
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                      >
                        Exécuter cette étape
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}