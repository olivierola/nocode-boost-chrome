import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Eye, Play } from 'lucide-react';

interface PlanSummaryCardProps {
  title: string;
  description: string;
  featuresCount: number;
  pagesCount: number;
  onOpenMindmap: () => void;
  onExecutePlan?: () => void;
}

export const PlanSummaryCard = ({ 
  title, 
  description, 
  featuresCount, 
  pagesCount, 
  onOpenMindmap, 
  onExecutePlan 
}: PlanSummaryCardProps) => {
  return (
    <Card className="mt-4 border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2">
                📋 Plan : {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {featuresCount} fonctionnalités
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {pagesCount} pages
              </Badge>
              <Badge variant="outline" className="text-xs">
                Mindmap interactive
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onOpenMindmap}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-2" />
                Ouvrir le plan
              </Button>
              
              {onExecutePlan && (
                <Button 
                  size="sm" 
                  onClick={onExecutePlan}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-2" />
                  Exécuter
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};