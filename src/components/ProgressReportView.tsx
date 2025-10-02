import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ProgressReport {
  id: string;
  report_markdown: string;
  summary: string;
  metadata: any;
  created_at: string;
}

interface ProgressReportViewProps {
  projectId: string;
  planId?: string;
}

export function ProgressReportView({ projectId, planId }: ProgressReportViewProps) {
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, [projectId]);

  const loadReports = async () => {
    try {
      let query = supabase
        .from('agent_progress_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (planId) {
        query = query.eq('plan_id', planId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewReport = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('generate-progress-report', {
        body: { projectId, planId }
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rapport d'avancement généré",
      });

      loadReports();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Chargement des rapports...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rapports d'Avancement</h3>
          <p className="text-sm text-muted-foreground">
            Suivi des actions effectuées par l'agent
          </p>
        </div>
        <Button onClick={generateNewReport} disabled={isGenerating}>
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Génération...' : 'Générer un rapport'}
        </Button>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">
                    Rapport du {new Date(report.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </CardTitle>
                  <CardDescription className="mt-2">{report.summary}</CardDescription>
                </div>
                {report.metadata?.total_actions && (
                  <Badge variant="secondary">
                    {report.metadata.total_actions} action{report.metadata.total_actions > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
                <ReactMarkdown>{report.report_markdown}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Aucun rapport d'avancement généré pour le moment.
              <br />
              Cliquez sur "Générer un rapport" pour créer le premier.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}