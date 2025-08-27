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
    marketStudy: {
      title: string;
      content: string;
      competitors: string[];
      opportunities: string[];
      risks: string[];
    };
    projectDescription: {
      title: string;
      summary: string;
      objectives: string[];
      targetAudience: string;
    };
    technicalDocumentation: {
      title: string;
      modules: Array<{
        name: string;
        description: string;
        technologies: string[];
      }>;
      architecture: string;
      recommendedTools: string[];
    };
    features: Array<{
      id: string;
      title: string;
      description: string;
      specifications: string;
      prompt: string;
      order: number;
      subFeatures?: Array<{
        id: string;
        title: string;
        description: string;
        specifications: string;
        prompt: string;
      }>;
    }>;
    pages: Array<{
      id: string;
      title: string;
      content: string;
      interactions: string;
    }>;
    visualIdentity: {
      colors: {
        primary: string[];
        secondary: string[];
        backgrounds: string[];
        texts: string[];
      };
      icons: string[];
      typography: {
        fonts: string[];
        sizes: string[];
      };
      styles: {
        borderRadius: string;
        shadows: string;
        spacing: string;
      };
    };
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
      case 'feature': return <Lightbulb className="h-5 w-5" />;
      case 'page': return <Eye className="h-5 w-5" />;
      case 'visual': return <Palette className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'central': return 'bg-primary text-primary-foreground';
      case 'market': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'project': return 'bg-green-100 text-green-900 border-green-300';
      case 'technical': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'feature': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'page': return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'visual': return 'bg-indigo-100 text-indigo-900 border-indigo-300';
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
        <Badge variant="outline" className="text-xs mb-2">
          Ordre: {data.order}
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
      { id: 'features', title: 'Fonctionnalités', type: 'feature', data: { title: 'Fonctionnalités' } },
      { id: 'pages', title: 'Pages', type: 'page', data: { title: 'Pages' } },
      { id: 'visual', title: 'Identité visuelle', type: 'visual', data: data.branches.visualIdentity }
    ];

    branches.forEach((branch, index) => {
      const angle = (index * 60) * (Math.PI / 180); // 6 branches à 60° d'intervalle
      const radius = 300;
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

    // Ajout des features individuelles
    data.branches.features.forEach((feature, index) => {
      const angle = ((index * 30) - 45) * (Math.PI / 180); // Répartition autour de la branche features
      const radius = 200;
      const baseX = Math.cos(60 * (Math.PI / 180)) * 300; // Position de la branche features
      const baseY = Math.sin(60 * (Math.PI / 180)) * 300;
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
          onExecute: () => onExecuteFeature?.(feature),
          details: feature
        }
      });

      edges.push({
        id: `features-feature-${feature.id}`,
        source: 'features',
        target: `feature-${feature.id}`,
        type: 'smoothstep',
        style: { stroke: '#f59e0b', strokeWidth: 1 }
      });
    });

    // Ajout des pages
    data.branches.pages.forEach((page, index) => {
      const angle = ((index * 45) - 45) * (Math.PI / 180);
      const radius = 180;
      const baseX = Math.cos(120 * (Math.PI / 180)) * 300;
      const baseY = Math.sin(120 * (Math.PI / 180)) * 300;
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
                      <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                    </div>
                  )}
                  
                  {selectedNode.details && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Détails</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(selectedNode.details, null, 2)}
                        </pre>
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