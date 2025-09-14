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
  const [openSections, setOpenSections] = useState<string[]>(['section1']);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [showPromptDialog, setShowPromptDialog] = useState<{ field: string; context: any } | null>(null);

  const sections: Section[] = [
    {
      id: 'section1',
      title: '📌 1. Vision & Objectifs',
      data: plan.section1_vision_objectifs || {},
    },
    {
      id: 'section2',
      title: '📌 2. Analyse & Recherche',
      data: plan.section2_analyse_recherche || {},
    },
    {
      id: 'section3',
      title: '📌 3. Cahier des charges fonctionnel',
      data: plan.section3_cahier_charges || {},
    },
    {
      id: 'section4',
      title: '📌 4. Architecture du produit',
      data: plan.section4_architecture_produit || {},
    },
    {
      id: 'section5',
      title: '📌 5. Architecture de l\'application (pages & UI)',
      data: plan.section5_architecture_application || {},
      hasPrompts: true,
    },
    {
      id: 'section6',
      title: '📌 6. Design & Expérience utilisateur',
      data: plan.section6_design_ux || {},
    },
    {
      id: 'section7',
      title: '📌 7. Plan technique détaillé',
      data: plan.section7_plan_technique || {},
    },
    {
      id: 'section8',
      title: '📌 8. Roadmap & Gestion de projet',
      data: plan.section8_roadmap_gestion || {},
    },
    {
      id: 'section9',
      title: '📌 9. Tests & Qualité',
      data: plan.section9_tests_qualite || {},
    },
    {
      id: 'section10',
      title: '📌 10. Déploiement & Infrastructure',
      data: plan.section10_deploiement || {},
    },
    {
      id: 'section11',
      title: '📌 11. Business & Monétisation',
      data: plan.section11_business_monetisation || {},
    },
    {
      id: 'section12',
      title: '📌 12. Sécurité & RGPD',
      data: plan.section12_securite_rgpd || {},
    },
    {
      id: 'section13',
      title: '📌 13. Lancement & Growth',
      data: plan.section13_lancement_growth || {},
    },
    {
      id: 'section14',
      title: '📌 14. Évolution & Maintenance',
      data: plan.section14_evolution_maintenance || {},
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
    
    const updatedPlan = {
      ...plan,
      [sectionId]: {
        ...plan[sectionId],
        [fieldKey]: tempValue
      }
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
          
          if (section.id === 'section5' && key === 'pages' && Array.isArray(value)) {
            return (
              <div key={key} className="space-y-4">
                <h4 className="font-medium text-foreground">Pages de l'application</h4>
                {value.map((page: any, pageIndex: number) => (
                  <div key={pageIndex} className="border border-border rounded-lg p-4">
                    {renderField(section.id, `pages.${pageIndex}.name`, page.name, 'Nom de la page')}
                    {renderField(section.id, `pages.${pageIndex}.description`, page.description, 'Description')}
                    {renderField(section.id, `pages.${pageIndex}.prompt`, page.prompt, 'Prompt pour l\'IA', true)}
                    
                    {page.sections && (
                      <div className="mt-4">
                        <h5 className="font-medium text-foreground mb-2">Sections</h5>
                        {page.sections.map((sect: any, sectIndex: number) => (
                          <div key={sectIndex} className="border-l-2 border-primary/20 pl-4 mb-4">
                            {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.name`, sect.name, 'Nom de la section')}
                            {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.description`, sect.description, 'Description')}
                            
                            {sect.modules && (
                              <div className="mt-2">
                                <h6 className="text-sm font-medium text-foreground mb-2">Modules</h6>
                                {sect.modules.map((module: any, moduleIndex: number) => (
                                  <div key={moduleIndex} className="bg-background/50 p-3 rounded border">
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.name`, module.name, 'Nom du module')}
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.description`, module.description, 'Description')}
                                    {renderField(section.id, `pages.${pageIndex}.sections.${sectIndex}.modules.${moduleIndex}.prompt`, module.prompt, 'Prompt pour l\'IA', true)}
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
        <h1 className="text-2xl font-bold text-foreground mb-2">{plan.title || 'Plan détaillé'}</h1>
        <p className="text-muted-foreground">{plan.description}</p>
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