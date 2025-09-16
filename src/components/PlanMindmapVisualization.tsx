import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  MiniMap,
  Position,
  Handle,
} from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Eye, Code, Palette, Target, Users, Lightbulb, FileText, Play, Rocket, Database, Layout, Shield, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '@xyflow/react/dist/style.css';

interface MindmapPlanData {
  documentation?: {
    project_overview: string;
    vision_objectives?: any;
    mvp?: any;
    advanced_features?: any[];
    market_study?: any;
    competitive_analysis?: any;
    product_description?: any;
    architecture?: any;
  };
  implementation_plan?: {
    startup_prompt: string;
    pages: Array<{
      page_name: string;
      description: string;
      prompt: string;
      sections: Array<{
        section_name: string;
        description: string;
        prompt: string;
        modules: Array<{
          module_name: string;
          description: string;
          prompt: string;
        }>;
        design?: any;
        seo_content?: any;
        contenus?: any;
      }>;
    }>;
  };
  backend_database?: {
    data_model?: any;
    backend_functions?: any;
    stripe_integration?: any;
  };
  security_plan?: {
    rbac?: any;
    api_security?: string;
    data_protection?: string;
    authentication?: string;
  };
}

interface PlanMindmapVisualizationProps {
  isOpen: boolean;
  onClose: () => void;
  data: MindmapPlanData;
  onExecuteFeature?: (feature: any) => void;
}

// Composant pour un nœud personnalisé avec design amélioré
const CustomPlanNode = ({ data }: { data: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'main': return <Target className="h-6 w-6" />;
      case 'startup': return <Rocket className="h-5 w-5" />;
      case 'product': return <FileText className="h-5 w-5" />;
      case 'market': return <Users className="h-5 w-5" />;
      case 'technical': return <Code className="h-5 w-5" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'features': return <Lightbulb className="h-5 w-5" />;
      case 'feature': return <Lightbulb className="h-4 w-4" />;
      case 'subfeature': return <span className="text-sm">💡</span>;
      case 'pages': return <Layout className="h-5 w-5" />;
      case 'page': return <Eye className="h-4 w-4" />;
      case 'visual': return <Palette className="h-5 w-5" />;
      case 'security': return <Shield className="h-5 w-5" />;
      case 'roadmap': return <span className="text-sm">📅</span>;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getNodeStyle = (type: string) => {
    switch (type) {
      case 'main': 
        return 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-300 shadow-xl min-w-[250px]';
      case 'startup': 
        return 'bg-gradient-to-br from-green-500 to-emerald-500 text-white border-green-300 shadow-lg min-w-[200px]';
      case 'product': 
        return 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-blue-300 shadow-lg min-w-[200px]';
      case 'market': 
        return 'bg-gradient-to-br from-orange-500 to-red-500 text-white border-orange-300 shadow-lg min-w-[200px]';
      case 'technical': 
        return 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-indigo-300 shadow-lg min-w-[200px]';
      case 'features': 
        return 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white border-amber-300 shadow-lg min-w-[180px]';
      case 'feature': 
        return 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 transition-colors min-w-[150px]';
      case 'subfeature': 
        return 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 transition-colors min-w-[120px]';
      case 'pages': 
        return 'bg-gradient-to-br from-pink-500 to-rose-500 text-white border-pink-300 shadow-lg min-w-[180px]';
      case 'page': 
        return 'bg-pink-100 text-pink-900 border-pink-300 hover:bg-pink-200 transition-colors min-w-[140px]';
      case 'visual': 
        return 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white border-violet-300 shadow-lg min-w-[200px]';
      case 'security': 
        return 'bg-gradient-to-br from-red-600 to-red-700 text-white border-red-300 shadow-lg min-w-[200px]';
      case 'roadmap': 
        return 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white border-teal-300 shadow-lg min-w-[200px]';
      default: 
        return 'bg-gray-100 text-gray-900 border-gray-300 min-w-[120px]';
    }
  };

  const isMainNode = data.type === 'main';
  const isCategoryNode = ['startup', 'product', 'market', 'technical', 'features', 'pages', 'visual', 'security', 'roadmap'].includes(data.type);

  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-lg max-w-[300px] ${getNodeStyle(data.type)}`}>
      {/* Handles pour les connexions */}
      <Handle type="target" position={Position.Top} className="!bg-white !border-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-white !border-gray-400" />
      <Handle type="source" position={Position.Left} className="!bg-white !border-gray-400" />
      <Handle type="source" position={Position.Right} className="!bg-white !border-gray-400" />
      
      <div className="flex items-center gap-3 mb-2">
        {getNodeIcon(data.type)}
        <h3 className={`font-semibold ${isMainNode ? 'text-lg' : isCategoryNode ? 'text-base' : 'text-sm'} truncate`}>
          {data.title}
        </h3>
      </div>
      
      {data.description && (
        <p className={`${isMainNode ? 'text-sm' : 'text-xs'} opacity-90 line-clamp-2 mb-2`}>
          {data.description}
        </p>
      )}
      
      {/* Badges pour les métadonnées */}
      <div className="flex flex-wrap gap-1 mb-2">
        {data.priority && (
          <Badge 
            variant={data.priority === 'haute' ? 'destructive' : data.priority === 'moyenne' ? 'default' : 'secondary'} 
            className="text-xs"
          >
            {data.priority}
          </Badge>
        )}
        
        {data.estimatedTime && (
          <Badge variant="outline" className="text-xs bg-white/20">
            {data.estimatedTime}
          </Badge>
        )}

        {data.complexity && (
          <Badge variant="outline" className="text-xs bg-white/20">
            {data.complexity}
          </Badge>
        )}
      </div>
      
      {/* Boutons d'action */}
      <div className="flex gap-1">
        {data.details && (
          <Button 
            size="sm" 
            variant="ghost" 
            className={`text-xs h-6 px-2 ${isCategoryNode ? 'bg-white/20 hover:bg-white/30 text-white' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Réduire' : 'Détails'}
          </Button>
        )}
        
        {data.onExecute && (
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-6 px-2 bg-white/20 hover:bg-white/30 border-white/30"
            onClick={data.onExecute}
          >
            <Play className="h-3 w-3 mr-1" />
            Exécuter
          </Button>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomPlanNode,
};

export const PlanMindmapVisualization = ({ isOpen, onClose, data, onExecuteFeature }: PlanMindmapVisualizationProps) => {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Génération intelligente des nœuds et arêtes avec hiérarchie améliorée
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1. Nœud principal central
    nodes.push({
      id: 'main',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        title: data.documentation?.project_overview || 'Plan SaaS',
        description: data.documentation?.project_overview || 'Plan de développement',
        type: 'main',
        details: data.documentation
      }
    });

    // 2. Nœud startup prompt (première étape)
    if (data.implementation_plan?.startup_prompt) {
      nodes.push({
        id: 'startup',
        type: 'custom',
        position: { x: 0, y: -300 },
        data: {
          title: 'Prompt de Démarrage',
          description: 'Initialisation du projet',
          type: 'startup',
          details: { startup_prompt: data.implementation_plan.startup_prompt },
          onExecute: () => onExecuteFeature?.(data.implementation_plan?.startup_prompt)
        }
      });

      edges.push({
        id: 'startup-main',
        source: 'startup',
        target: 'main',
        type: 'smoothstep',
        style: { stroke: '#10b981', strokeWidth: 3 },
        label: 'Initialise'
      });
    }

    // Connexion startup -> main
    edges.push({
      id: 'startup-main',
      source: 'startup',
      target: 'main',
      type: 'smoothstep',
      style: { stroke: '#10b981', strokeWidth: 3 },
      label: 'Initialise'
    });

    // 3. Branches principales autour du centre
    const mainBranches = [
      { 
        id: 'documentation', 
        title: 'Documentation', 
        type: 'product', 
        position: { x: -400, y: -150 },
        details: data.documentation 
      },
      { 
        id: 'backend', 
        title: 'Backend & DB', 
        type: 'technical', 
        position: { x: -400, y: 150 },
        details: data.backend_database 
      },
      { 
        id: 'pages', 
        title: 'Pages', 
        type: 'pages', 
        position: { x: 600, y: 0 },
        details: { title: 'Pages du site' } 
      },
      { 
        id: 'security', 
        title: 'Sécurité', 
        type: 'security', 
        position: { x: 0, y: -600 },
        details: data.security_plan 
      }
    ];

    mainBranches.forEach(branch => {
      nodes.push({
        id: branch.id,
        type: 'custom',
        position: branch.position,
        data: {
          title: branch.title,
          type: branch.type,
          details: branch.details
        }
      });

      edges.push({
        id: `main-${branch.id}`,
        source: 'main',
        target: branch.id,
        type: 'smoothstep',
        style: { stroke: '#8b5cf6', strokeWidth: 2 }
      });
    });

    // 4. Features individuelles avec sous-features
    data.features.forEach((feature, index) => {
      const angle = ((index * (360 / data.features.length)) - 90) * (Math.PI / 180);
      const radius = 300;
      const x = -600 + Math.cos(angle) * radius;
      const y = 0 + Math.sin(angle) * radius;

      const featureNodeId = `feature-${feature.id}`;
      nodes.push({
        id: featureNodeId,
        type: 'custom',
        position: { x, y },
        data: {
          title: feature.title,
          description: feature.description,
          type: 'feature',
          priority: feature.priority,
          complexity: feature.complexity,
          estimatedTime: feature.estimatedTime,
          onExecute: () => onExecuteFeature?.(feature),
          details: feature
        }
      });

      edges.push({
        id: `features-${featureNodeId}`,
        source: 'features',
        target: featureNodeId,
        type: 'smoothstep',
        style: { stroke: '#f59e0b', strokeWidth: 2 }
      });

      // Sous-features connectées à leurs features parentes
      if (feature.subFeatures && feature.subFeatures.length > 0) {
        feature.subFeatures.forEach((subFeature, subIndex) => {
          const subAngle = ((subIndex * 60) - 30) * (Math.PI / 180);
          const subRadius = 150;
          const subX = x + Math.cos(subAngle) * subRadius;
          const subY = y + Math.sin(subAngle) * subRadius;
          const subFeatureNodeId = `subfeature-${subFeature.id}`;

          nodes.push({
            id: subFeatureNodeId,
            type: 'custom',
            position: { x: subX, y: subY },
            data: {
              title: subFeature.title,
              description: subFeature.description,
              type: 'subfeature',
              parentId: feature.id,
              onExecute: () => onExecuteFeature?.(subFeature),
              details: subFeature
            }
          });

          edges.push({
            id: `${featureNodeId}-${subFeatureNodeId}`,
            source: featureNodeId,
            target: subFeatureNodeId,
            type: 'smoothstep',
            style: { stroke: '#fbbf24', strokeWidth: 1 }
          });
        });
      }
    });

    // 5. Pages avec leurs sections
    data.pages.forEach((page, index) => {
      const angle = ((index * (360 / data.pages.length)) - 90) * (Math.PI / 180);
      const radius = 250;
      const x = 600 + Math.cos(angle) * radius;
      const y = 0 + Math.sin(angle) * radius;

      const pageNodeId = `page-${page.id}`;
      nodes.push({
        id: pageNodeId,
        type: 'custom',
        position: { x, y },
        data: {
          title: page.name,
          description: page.description,
          type: 'page',
          details: page
        }
      });

      edges.push({
        id: `pages-${pageNodeId}`,
        source: 'pages',
        target: pageNodeId,
        type: 'smoothstep',
        style: { stroke: '#ec4899', strokeWidth: 2 }
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [data, onExecuteFeature]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0">
        <div className="flex h-[98vh]">
          {/* Zone principale de la mindmap */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gradient-to-br from-slate-50 to-blue-50"
            >
              <Background />
              <Controls />
              <MiniMap 
                nodeColor={(node) => {
                  switch (node.data.type) {
                    case 'main': return '#8b5cf6';
                    case 'startup': return '#10b981';
                    case 'feature': return '#f59e0b';
                    case 'subfeature': return '#fbbf24';
                    case 'page': return '#ec4899';
                    default: return '#6b7280';
                  }
                }}
              />
            </ReactFlow>
            
            {/* Header superposé */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  🧠 {data.title}
                </h2>
                <p className="text-sm text-muted-foreground">{data.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">
                    {data.features.length} features
                  </Badge>
                  <Badge variant="outline">
                    {data.pages.length} pages
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Panneau de détails avec contenu markdown */}
          {selectedNode && (
            <div className="w-96 border-l bg-white overflow-hidden">
              <DialogHeader className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <DialogTitle className="flex items-center gap-3">
                  {selectedNode.type === 'main' && <Target className="h-6 w-6 text-purple-600" />}
                  {selectedNode.type === 'startup' && <Rocket className="h-6 w-6 text-green-600" />}
                  {selectedNode.type === 'product' && <FileText className="h-6 w-6 text-blue-600" />}
                  {selectedNode.type === 'market' && <Users className="h-6 w-6 text-orange-600" />}
                  {selectedNode.type === 'technical' && <Code className="h-6 w-6 text-indigo-600" />}
                  {selectedNode.type === 'features' && <Lightbulb className="h-6 w-6 text-amber-600" />}
                  {selectedNode.type === 'feature' && <Lightbulb className="h-5 w-5 text-amber-600" />}
                  {selectedNode.type === 'pages' && <Layout className="h-6 w-6 text-pink-600" />}
                  {selectedNode.type === 'page' && <Eye className="h-5 w-5 text-pink-600" />}
                  {selectedNode.type === 'visual' && <Palette className="h-6 w-6 text-violet-600" />}
                  {selectedNode.type === 'security' && <Shield className="h-6 w-6 text-red-600" />}
                  <span className="text-lg">{selectedNode.title}</span>
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="h-[calc(98vh-120px)]">
                <div className="p-4 space-y-4">
                  {selectedNode.description && (
                    <div>
                      <h4 className="font-semibold mb-2 text-gray-900">Description</h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{selectedNode.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.details && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          📋 Détails complets
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {typeof selectedNode.details === 'string' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{selectedNode.details}</ReactMarkdown>
                          </div>
                        ) : (
                          Object.entries(selectedNode.details).map(([key, value]) => (
                            <div key={key} className="border-l-4 border-blue-200 pl-4">
                              <h5 className="font-semibold text-sm mb-2 text-blue-900 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </h5>
                              {typeof value === 'string' ? (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown>{value}</ReactMarkdown>
                                </div>
                              ) : Array.isArray(value) ? (
                                <div className="space-y-1">
                                  {value.map((item, i) => (
                                    <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      {typeof item === 'string' ? (
                                        <ReactMarkdown>{item}</ReactMarkdown>
                                      ) : (
                                        JSON.stringify(item, null, 2)
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : value && typeof value === 'object' ? (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  {Object.entries(value).map(([subKey, subValue]) => (
                                    <div key={subKey} className="mb-2">
                                      <span className="font-medium text-xs text-gray-600 uppercase tracking-wide">
                                        {subKey}:
                                      </span>
                                      <div className="mt-1 text-sm">
                                        {typeof subValue === 'string' ? (
                                          <ReactMarkdown>{subValue}</ReactMarkdown>
                                        ) : (
                                          <pre className="text-xs bg-white p-2 rounded overflow-auto">
                                            {JSON.stringify(subValue, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">{String(value)}</p>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedNode.onExecute && (
                    <Button 
                      onClick={selectedNode.onExecute}
                      className="w-full"
                      size="lg"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Exécuter cette étape
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanMindmapVisualization;