import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Textarea } from './textarea'
import { Label } from './label'

interface PlanStep {
  id: string
  title: string
  description: string
  prompt?: string
  type: 'documentation' | 'implementation' | 'backend' | 'security'
  status?: 'pending' | 'in-progress' | 'completed' | 'error'
}

interface EditStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: PlanStep | null
  onSave: (updatedStep: PlanStep) => void
}

export default function EditStepDialog({ open, onOpenChange, step, onSave }: EditStepDialogProps) {
  const [formData, setFormData] = useState<Partial<PlanStep>>({})

  useEffect(() => {
    if (step) {
      setFormData({
        title: step.title,
        description: step.description,
        prompt: step.prompt || '',
      })
    }
  }, [step])

  const handleSave = () => {
    if (step && formData.title && formData.description) {
      onSave({
        ...step,
        title: formData.title,
        description: formData.description,
        prompt: formData.prompt,
      })
      onOpenChange(false)
    }
  }

  if (!step) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modifier l'étape</DialogTitle>
          <DialogDescription>
            Modifiez les détails de cette étape du plan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Titre de l'étape"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de l'étape"
              rows={3}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              value={formData.prompt || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Prompt à exécuter pour cette étape"
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}