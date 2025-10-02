import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Copy, 
  Plus, 
  Search, 
  Check,
  Upload,
  File,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Download,
  Eye,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Component {
  id: string;
  nom: string;
  description: string | null;
  prompt: string | null;
  created_at: string;
}

interface MediaFile {
  id: string;
  nom: string;
  type: string;
  url: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const ComponentsSaved = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComponents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les composants",
        variant: "destructive",
      });
    }
  };

  const fetchMediaFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les fichiers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          nom: file.name,
          type: file.type,
          url: publicUrl,
          user_id: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Fichier uploadé",
        description: `${file.name} a été uploadé avec succès`,
      });

      await fetchMediaFiles();
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: `Impossible d'uploader ${file.name}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      uploadFile(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (file: MediaFile) => {
    try {
      const url = new URL(file.url);
      const pathSegments = url.pathname.split('/');
      const filePath = pathSegments.slice(-2).join('/');

      const { error: storageError } = await supabase.storage
        .from('assets')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "Fichier supprimé",
        description: `${file.nom} a été supprimé`,
      });

      await fetchMediaFiles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
  };

  const copyPrompt = async (component: Component) => {
    if (!component.prompt) return;

    try {
      await navigator.clipboard.writeText(component.prompt);
      setCopiedId(component.id);
      
      toast({
        title: "Prompt copié",
        description: `Le prompt pour "${component.nom}" a été copié`,
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le prompt",
        variant: "destructive",
      });
    }
  };

  const addToPrompt = (component: Component) => {
    const tag = `{component:${component.nom}}`;
    
    window.dispatchEvent(new CustomEvent('addComponentTag', { 
      detail: { tag, component } 
    }));
    
    toast({
      title: "Composant ajouté",
      description: `Tag "${tag}" ajouté au prompt`,
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredComponents = components.filter(component =>
    component.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMediaFiles = mediaFiles.filter(file =>
    file.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchComponents(), fetchMediaFiles()]);
    };
    fetchData();
  }, [user]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Ressources Sauvegardées</h2>
            <p className="text-xs text-muted-foreground">
              Gérez vos composants et médias
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-4 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="components" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="components">Composants</TabsTrigger>
            <TabsTrigger value="media">Médias</TabsTrigger>
          </TabsList>

          {/* Components Tab */}
          <TabsContent value="components" className="flex-1 overflow-y-auto space-y-3 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredComponents.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {searchTerm ? 'Aucun composant trouvé' : 'Aucun composant sauvegardé'}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Importez vos premiers composants depuis 21st.dev
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredComponents.map((component) => (
                <Card key={component.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {component.nom}
                        </CardTitle>
                        {component.description && (
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {component.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">
                        Composant
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyPrompt(component)}
                        className="flex-1"
                        disabled={!component.prompt}
                      >
                        {copiedId === component.id ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        {copiedId === component.id ? 'Copié!' : 'Copier prompt'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => addToPrompt(component)}
                        className="flex-1"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter au prompt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Upload Progress */}
              {uploading && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Upload en cours...</span>
                        <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Zone */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,.pdf,.txt,.doc,.docx"
              />
              <Card 
                className="border-dashed border-2 hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-center mb-1">
                    Cliquez pour uploader des fichiers
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Images, vidéos, PDF, texte... (Max 50MB par fichier)
                  </p>
                </CardContent>
              </Card>

              {/* Files Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMediaFiles.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <File className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      {searchTerm ? 'Aucun fichier trouvé' : 'Aucun fichier uploadé'}
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Commencez par uploader vos premiers médias
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredMediaFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* File Preview */}
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {file.type.startsWith('image/') ? (
                                <img 
                                  src={file.url} 
                                  alt={file.nom}
                                  className="w-12 h-12 object-cover rounded border"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                                  {getFileIcon(file.type)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium truncate" title={file.nom}>
                                {file.nom}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {file.type.split('/')[0]}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(file.created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              asChild
                            >
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3 w-3 mr-1" />
                                Voir
                              </a>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              asChild
                            >
                              <a href={file.url} download={file.nom}>
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger
                              </a>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteFile(file)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComponentsSaved;
