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
import { X, Eye, Code, Palette, Target, Users, Lightbulb, FileText, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '@xyflow/react/dist/style.css';

interface MindmapData {
  title: string;
  description: string;
  centralNode: {
    id: string;
    title: string;
    description: string;
  };
  branches: {
    marketStudy: any;
    projectDescription: any;
    technicalDocumentation: any;
    timeline?: any;
    team?: any;
    features: Array<{
      id: string;
      title: string;
      description: string;
      specifications: string;
      prompt: string;
      order: number;
      priority?: string;
      complexity?: string;
      estimatedTime?: string;
      dependencies?: string[];
      acceptanceCriteria?: string[];
      subFeatures?: Array<{
        id: string;
        title: string;
        description: string;
        specifications: string;
        prompt: string;
        estimatedTime?: string;
        parentId?: string;
      }>;
    }>;
    pages: Array<{
      id: string;
      title: string;
      content: string;
      interactions: string;
      components?: string[];
      wireframe?: string;
      seo?: any;
    }>;
    visualIdentity: any;
    testing?: any;
    deployment?: any;
    noCodePlatforms?: any;
  };
}

interface MindmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MindmapData;
  onExecuteFeature?: (feature: any) => void;
}

// Composant pour un nœud personnalisé
const CustomNode = ({ data }: { data: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'central': return <Target className="h-5 w-5" />;
      case 'market': return <Users className="h-5 w-5" />;
      case 'project': return <FileText className="h-5 w-5" />;
      case 'technical': return <Code className="h-5 w-5" />;
      case 'timeline': return '📅';
      case 'team': return '👥';
      case 'feature': return <Lightbulb className="h-5 w-5" />;
      case 'subfeature': return '💡';
      case 'page': return <Eye className="h-5 w-5" />;
      case 'visual': return <Palette className="h-5 w-5" />;
      case 'testing': return '🧪';
      case 'deployment': return '🚀';
      case 'platforms': return '🔧';
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'central': return 'bg-primary text-primary-foreground';
      case 'market': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'project': return 'bg-green-100 text-green-900 border-green-300';
      case 'technical': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'timeline': return 'bg-cyan-100 text-cyan-900 border-cyan-300';
      case 'team': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'feature': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'subfeature': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      case 'page': return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'visual': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'testing': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'deployment': return 'bg-red-100 text-red-900 border-red-300';
      case 'platforms': return 'bg-slate-100 text-slate-900 border-slate-300';
      default: return 'bg-gray-100 text-gray-900 border-gray-300';
    }
  };

  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px] max-w-[300px] ${getBgColor(data.type)}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      
      <div className="flex items-center gap-2 mb-2">
        {getNodeIcon(data.type)}
        <h3 className="font-semibold text-sm truncate">{data.title}</h3>
      </div>
      
      {data.description && (
        <p className="text-xs opacity-80 line-clamp-2 mb-2">{data.description}</p>
      )}
      
      {data.type === 'feature' && data.order && (
        <Badge variant="outline" className="text-xs mb-1">
          #{data.order}
        </Badge>
      )}
      
      {data.priority && (
        <Badge 
          variant={data.priority === 'haute' ? 'destructive' : data.priority === 'moyenne' ? 'default' : 'secondary'} 
          className="text-xs mb-1 mr-1"
        >
          {data.priority}
        </Badge>
      )}
      
      {data.estimatedTime && (
        <Badge variant="outline" className="text-xs mb-1">
          {data.estimatedTime}
        </Badge>
      )}
      
      {data.details && (
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs h-6 px-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Réduire' : 'Détails'}
        </Button>
      )}
      
      {data.onExecute && (
        <Button 
          size="sm" 
          variant="outline" 
          className="text-xs h-6 px-2 ml-1"
          onClick={data.onExecute}
        >
          <Play className="h-3 w-3 mr-1" />
          Exécuter
        </Button>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export const MindmapModal = ({ isOpen, onClose, data, onExecuteFeature }: MindmapModalProps) => {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Génération des nœuds et arêtes pour React Flow
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Nœud central
    nodes.push({
      id: 'central',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        title: data.centralNode.title,
        description: data.centralNode.description,
        type: 'central'
      }
    });

    // Branches principales en cercle autour du centre
    const branches = [
      { id: 'market', title: 'Étude de marché', type: 'market', data: data.branches.marketStudy },
      { id: 'project', title: 'Description projet', type: 'project', data: data.branches.projectDescription },
      { id: 'technical', title: 'Documentation technique', type: 'technical', data: data.branches.technicalDocumentation },
      { id: 'timeline', title: 'Planning', type: 'timeline', data: data.branches.timeline },
      { id: 'team', title: 'Équipe & Ressources', type: 'team', data: data.branches.team },
      { id: 'features', title: 'Fonctionnalités', type: 'feature', data: { title: 'Fonctionnalités' } },
      { id: 'pages', title: 'Pages', type: 'page', data: { title: 'Pages' } },
      { id: 'visual', title: 'Identité visuelle', type: 'visual', data: data.branches.visualIdentity },
      { id: 'testing', title: 'Tests & QA', type: 'testing', data: data.branches.testing },
      { id: 'deployment', title: 'Déploiement', type: 'deployment', data: data.branches.deployment },
      { id: 'platforms', title: 'Plateformes No-Code', type: 'platforms', data: data.branches.noCodePlatforms }
    ];

    branches.forEach((branch, index) => {
      const angle = (index * (360 / branches.length)) * (Math.PI / 180); // Répartition égale
      const radius = 350;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      nodes.push({
        id: branch.id,
        type: 'custom',
        position: { x, y },
        data: {
          title: branch.title,
          type: branch.type,
          details: branch.data
        }
      });

      edges.push({
        id: `central-${branch.id}`,
        source: 'central',
        target: branch.id,
        type: 'smoothstep',
        style: { stroke: '#8b5cf6', strokeWidth: 2 }
      });
    });

    // Ajout des features individuelles avec sous-features
    data.branches.features.forEach((feature, index) => {
      const angle = ((index * (360 / data.branches.features.length)) - 90) * (Math.PI / 180);
      const radius = 250;
      const featuresIndex = branches.findIndex(b => b.id === 'features');
      const branchAngle = (featuresIndex * (360 / branches.length)) * (Math.PI / 180);
      const baseX = Math.cos(branchAngle) * 350;
      const baseY = Math.sin(branchAngle) * 350;
      const x = baseX + Math.cos(angle) * radius;
      const y = baseY + Math.sin(angle) * radius;

      nodes.push({
        id: `feature-${feature.id}`,
        type: 'custom',
        position: { x, y },
        data: {
          title: feature.title,
          description: feature.description,
          type: 'feature',
          order: feature.order,
          priority: feature.priority,
          complexity: feature.complexity,
          estimatedTime: feature.estimatedTime,
          onExecute: () => onExecuteFeature?.(feature),
          details: feature
        }
      });

      edges.push({
        id: `features-feature-${feature.id}`,
        source: 'features',
        target: `feature-${feature.id}`,
        type: 'smoothstep',
        style: { stroke: '#f59e0b', strokeWidth: 2 }
      });

      // Ajout des sous-features connectées à leur feature parente
      if (feature.subFeatures && feature.subFeatures.length > 0) {
        feature.subFeatures.forEach((subFeature, subIndex) => {
          const subAngle = ((subIndex * 60) - 30) * (Math.PI / 180);
          const subRadius = 120;
          const subX = x + Math.cos(subAngle) * subRadius;
          const subY = y + Math.sin(subAngle) * subRadius;

          nodes.push({
            id: `subfeature-${subFeature.id}`,
            type: 'custom',
            position: { x: subX, y: subY },
            data: {
              title: subFeature.title,
              description: subFeature.description,
              type: 'subfeature',
              parentId: feature.id,
              estimatedTime: subFeature.estimatedTime,
              onExecute: () => onExecuteFeature?.(subFeature),
              details: subFeature
            }
          });

          edges.push({
            id: `feature-${feature.id}-subfeature-${subFeature.id}`,
            source: `feature-${feature.id}`,
            target: `subfeature-${subFeature.id}`,
            type: 'smoothstep',
            style: { stroke: '#fbbf24', strokeWidth: 1 }
          });
        });
      }
    });

    // Ajout des pages
    data.branches.pages.forEach((page, index) => {
      const angle = ((index * (360 / data.branches.pages.length)) - 90) * (Math.PI / 180);
      const radius = 220;
      const pagesIndex = branches.findIndex(b => b.id === 'pages');
      const branchAngle = (pagesIndex * (360 / branches.length)) * (Math.PI / 180);
      const baseX = Math.cos(branchAngle) * 350;
      const baseY = Math.sin(branchAngle) * 350;
      const x = baseX + Math.cos(angle) * radius;
      const y = baseY + Math.sin(angle) * radius;

      nodes.push({
        id: `page-${page.id}`,
        type: 'custom',
        position: { x, y },
        data: {
          title: page.title,
          description: page.content,
          type: 'page',
          components: page.components,
          wireframe: page.wireframe,
          seo: page.seo,
          details: page
        }
      });

      edges.push({
        id: `pages-page-${page.id}`,
        source: 'pages',
        target: `page-${page.id}`,
        type: 'smoothstep',
        style: { stroke: '#ec4899', strokeWidth: 1 }
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
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <div className="flex h-[95vh]">
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
              className="bg-gray-50"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
            
            {/* Header superposé */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  🧠 {data.title}
                </h2>
                <p className="text-sm text-muted-foreground">{data.description}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Panneau de détails */}
          {selectedNode && (
            <div className="w-80 border-l bg-white">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  {selectedNode.type === 'central' && <Target className="h-5 w-5" />}
                  {selectedNode.type === 'market' && <Users className="h-5 w-5" />}
                  {selectedNode.type === 'project' && <FileText className="h-5 w-5" />}
                  {selectedNode.type === 'technical' && <Code className="h-5 w-5" />}
                  {selectedNode.type === 'feature' && <Lightbulb className="h-5 w-5" />}
                  {selectedNode.type === 'page' && <Eye className="h-5 w-5" />}
                  {selectedNode.type === 'visual' && <Palette className="h-5 w-5" />}
                  {selectedNode.title}
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="h-[calc(95vh-80px)]">
                <div className="p-4 space-y-4">
                  {selectedNode.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                        <ReactMarkdown>{selectedNode.description}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.details && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Détails complets</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-4">
                        {typeof selectedNode.details === 'string' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{selectedNode.details}</ReactMarkdown>
                          </div>
                        ) : (
                          Object.entries(selectedNode.details).map(([key, value]) => (
                            <div key={key}>
                              <h5 className="font-medium text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h5>
                              {typeof value === 'string' ? (
                                <div className="prose prose-xs max-w-none">
                                  <ReactMarkdown>{value}</ReactMarkdown>
                                </div>
                              ) : Array.isArray(value) ? (
                                <ul className="list-disc list-inside text-xs text-muted-foreground">
                                  {value.map((item, i) => (
                                    <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                                  ))}
                                </ul>
                              ) : value && typeof value === 'object' ? (
                                <div className="text-xs bg-gray-50 p-2 rounded">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">{String(value)}</p>
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
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Exécuter cette fonctionnalité
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