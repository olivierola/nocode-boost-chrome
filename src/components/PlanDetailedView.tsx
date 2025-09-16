import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaudeChatInput } from '@/components/ui/claude-style-ai-input';
import ReactMarkdown from 'react-markdown';

interface PlanDetailedViewProps {
  plan: any;
  onUpdatePlan?: (updatedPlan: any) => void;
  onExecutePrompt?: (prompt: string, context?: any) => void;
}

interface Section {
  id: string;
  title: string;
  data: any;
  hasPrompts?: boolean;
}

const PlanDetailedView: React.FC<PlanDetailedViewProps> = ({
  plan,
  onUpdatePlan,
  onExecutePrompt
}) => {
  const [openSections, setOpenSections] = useState<string[]>(['documentation']);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [showPromptDialog, setShowPromptDialog] = useState<{ field: string; context: any } | null>(null);

  if (!plan || !plan.plan_data) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Aucun plan sélectionné</p>
      </div>
    );
  }

  const planData = plan.plan_data;

  const sections: Section[] = [
    {
      id: 'documentation',
      title: '📌 1. Documentation générale',
      data: planData.documentation || {},
    },
    {
      id: 'implementation_plan',
      title: '📌 2. Plan d\'implémentation',
      data: planData.implementation_plan || {},
      hasPrompts: true,
    },
    {
      id: 'backend_database',
      title: '📌 3. Backend & Base de données',
      data: planData.backend_database || {},
    },
    {
      id: 'security_plan',
      title: '📌 4. Plan de sécurité',
      data: planData.security_plan || {},
    }
  ];

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const startEdit = (fieldKey: string, currentValue: string) => {
    setEditingField(fieldKey);
    setTempValue(currentValue || '');
  };

  const saveEdit = (sectionId: string, fieldKey: string) => {
    if (!onUpdatePlan) return;
    
    const updatedPlanData = {
      ...planData,
      [sectionId]: {
        ...planData[sectionId],
        [fieldKey]: tempValue
      }
    };
    
    const updatedPlan = {
      ...plan,
      plan_data: updatedPlanData
    };
    
    onUpdatePlan(updatedPlan);
    setEditingField(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setTempValue('');
  };

  const openPromptDialog = (field: string, context: any) => {
    setShowPromptDialog({ field, context });
  };

  const executePrompt = (prompt: string) => {
    if (onExecutePrompt && showPromptDialog) {
      onExecutePrompt(prompt, showPromptDialog.context);
    }
    setShowPromptDialog(null);
  };

  const renderField = (sectionId: string, fieldKey: string, value: any, label: string, hasPrompt = false) => {
    const fullFieldKey = `${sectionId}.${fieldKey}`;
    const isEditing = editingField === fullFieldKey;
    const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    
    return (
      <div key={fieldKey} className="mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">{label}</h4>
          <div className="flex gap-2">
            {hasPrompt && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPromptDialog(fullFieldKey, { sectionId, fieldKey, label })}
                className="h-8 w-8 p-0"
              >
                <Wand2 className="h-3 w-3" />
              </Button>
            )}
            {!isEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit(fullFieldKey, displayValue)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveEdit(sectionId, fieldKey)}
                  className="h-8 w-8 p-0"
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder={`Entrez le contenu pour ${label}`}
          />
        ) : (
          <div className="text-sm text-muted-foreground">
            {displayValue ? (
              <ReactMarkdown>
                {displayValue}
              </ReactMarkdown>
            ) : (
              <span className="italic">Non défini - Cliquez sur le bouton d'édition pour ajouter du contenu</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = (section: Section) => {
    if (!section.data || Object.keys(section.data).length === 0) {
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>Cette section n'a pas encore de contenu.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => openPromptDialog(section.id, { sectionId: section.id, title: section.title })}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Générer le contenu avec l'IA
          </Button>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {Object.entries(section.data).map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Gestion spéciale pour les pages dans implementation_plan
          if (section.id === 'implementation_plan' && key === 'pages' && Array.isArray(value)) {
            return (
              <div key={key} className="space-y-4">
                <h4 className="font-medium text-foreground">Pages de l'application</h4>
                {value.map((page: any, pageIndex: number) => (
                  <div key={pageIndex} className="border border-border rounded-lg p-4 space-y-4">
                    <div className="bg-primary/5 p-3 rounded">
                      <h5 className="font-semibold text-foreground mb-2">📄 Page : {page.page_name}</h5>
                      {renderField(section.id, `pages.${pageIndex}.page_name`, page.page_name, 'Nom de la page')}
                      {renderField(section.id, `pages.${pageIndex}.description`, page.description, 'Description de la page')}
                      {renderField(section.id, `pages.${pageIndex}.prompt`, page.prompt, 'Prompt pour l\'IA', true)}
                    </div>
                    
                    {page.sections && (
                      <div className="space-y-4">
                        <h6 className="font-medium text-foreground">🔹 Sections</h6>
                        {page.sections.map((sect: any, sectIndex: number) => (
                          <div key={sectIndex} className="border-l-4 border-primary/30 pl-6 space-y-3">
                            <div className="bg-secondary/20 p-3 rounded">
                              <h6 className="font-medium text-foreground mb-2">Section : {sect.section_name}</h6>
                              {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.section_name`, sect.section_name, 'Nom de la section')}
                              {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.description`, sect.description, 'Description de la section')}
                              {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.prompt`, sect.prompt, 'Prompt pour l\'IA', true)}
                            </div>
                            
                            {sect.modules && (
                              <div className="space-y-2">
                                <h6 className="text-sm font-medium text-foreground">Modules</h6>
                                {sect.modules.map((module: any, moduleIndex: number) => (
                                  <div key={moduleIndex} className="bg-muted/30 p-3 rounded border-l-2 border-accent/50">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Module : {module.module_name}</p>
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.module_name`, module.module_name, 'Nom du module')}
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.description`, module.description, 'Description du module')}
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.prompt`, module.prompt, 'Prompt pour l\'IA', true)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {sect.design && (
                              <div className="bg-accent/10 p-3 rounded">
                                <h6 className="text-sm font-medium text-foreground mb-2">🎨 Design</h6>
                                {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.design.typographie`, sect.design.typographie, 'Typographie (description textuelle)')}
                                {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.design.composants_reutilisables`, 
                                  Array.isArray(sect.design.composants_reutilisables) ? sect.design.composants_reutilisables.join(', ') : sect.design.composants_reutilisables, 
                                  'Composants réutilisables (liste)')}
                              </div>
                            )}

                            {sect.contenus && (
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                                <h6 className="text-sm font-medium text-foreground mb-2">💬 Contenus (clé-valeur)</h6>
                                {Object.entries(sect.contenus).map(([contentKey, contentValue]: [string, any]) => (
                                  <div key={contentKey} className="mb-2">
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.contenus.${contentKey}`, contentValue, `${contentKey} →`)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {sect.seo_content && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                <h6 className="text-sm font-medium text-foreground mb-2">🔍 Contenu SEO</h6>
                                {Object.entries(sect.seo_content).map(([seoKey, seoValue]: [string, any]) => (
                                  <div key={seoKey} className="mb-2">
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.seo_content.${seoKey}`, 
                                      Array.isArray(seoValue) ? seoValue.join(', ') : seoValue, 
                                      `${seoKey.replace(/_/g, ' ')} →`)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          }
          
          return renderField(section.id, key, value, label, section.hasPrompts);
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {planData.documentation?.project_overview || 'Plan détaillé'}
        </h1>
        <p className="text-muted-foreground">Plan généré automatiquement</p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-medium text-foreground">
                  {section.title}
                </div>
                {section.hasPrompts && (
                  <Badge variant="secondary" className="text-xs">
                    IA
                  </Badge>
                )}
              </div>
              <motion.div
                animate={{ rotate: openSections.includes(section.id) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence>
              {openSections.includes(section.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border">
                    {renderSectionContent(section)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Prompt Dialog */}
      {showPromptDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Génération IA pour: {showPromptDialog.context.label || 'Section'}
              </h3>
            </div>
            <div className="p-4">
              <ClaudeChatInput
                onSendMessage={executePrompt}
                placeholder="Décrivez ce que vous voulez générer pour cette section..."
                disabled={false}
              />
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" onClick={() => setShowPromptDialog(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanDetailedView;