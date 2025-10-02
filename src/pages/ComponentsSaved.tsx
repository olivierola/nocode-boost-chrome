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
  Loader2,
  Component,
  Palette,
  Type
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ExpandableTabs } from '@/components/ui/expandable-tabs';

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

interface ColorItem {
  nom: string;
  code: string;
}

interface PaletteItem {
  nom: string;
  couleurs: string[];
}

interface FontItem {
  nom: string;
}

const ComponentsSaved = () => {
  const [components, setComponents] = useState<Component[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Couleurs par défaut
  const defaultColors: ColorItem[] = [
    { nom: 'Primary Blue', code: '#3B82F6' },
    { nom: 'Purple', code: '#7C3AED' },
    { nom: 'Crimson', code: '#8B1538' },
    { nom: 'Emerald', code: '#10B981' },
    { nom: 'Orange', code: '#F97316' },
  ];

  // Palettes par défaut
  const defaultPalettes: PaletteItem[] = [
    { nom: 'Modern Blue', couleurs: ['#3B82F6', '#7C3AED', '#8B1538'] },
    { nom: 'Nature', couleurs: ['#10B981', '#059669', '#047857'] },
    { nom: 'Sunset', couleurs: ['#F97316', '#FB923C', '#FDBA74'] },
  ];

  // Polices par défaut
  const defaultFonts: FontItem[] = [
    { nom: 'Inter' },
    { nom: 'Roboto' },
    { nom: 'Poppins' },
    { nom: 'Playfair Display' },
    { nom: 'Montserrat' },
  ];

  const tabs = [
    { title: 'Composants', icon: Component },
    { title: 'Médias', icon: ImageIcon },
    { title: 'Couleurs', icon: Palette },
    { title: 'Polices', icon: Type },
  ];

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

  useEffect(() => {
    if (user) {
      fetchComponents();
      fetchMediaFiles();
    }
  }, [user]);

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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copié",
      description: "Le contenu a été copié dans le presse-papiers",
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const filteredComponents = components.filter(comp =>
    comp.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMediaFiles = mediaFiles.filter(file =>
    file.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Ressources sauvegardées</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos composants, médias, couleurs et polices</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-b-0"
          />
        </div>
      </div>
      <Card>
        <CardContent>
          <div className="mb-6">
            <ExpandableTabs tabs={tabs} onChange={setActiveTab} />
          </div>

          {/* Composants Tab */}
          {(activeTab === null || activeTab === 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Composants</h3>
              </div>
              {filteredComponents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun composant sauvegardé
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredComponents.map((component) => (
                    <Card key={component.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{component.nom}</CardTitle>
                            {component.description && (
                              <CardDescription className="mt-1">{component.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => component.prompt && handleCopy(component.prompt, component.id)}
                          >
                            {copiedId === component.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      {component.prompt && (
                        <CardContent>
                          <div className="bg-muted p-3 rounded-lg text-sm font-mono max-h-24 overflow-y-auto">
                            {component.prompt}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Médias Tab */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Médias</h3>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Uploader
                  </Button>
                </div>
              </div>

              {uploading && (
                <Card className="border-primary/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Upload en cours...</span>
                        <span className="font-medium">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {filteredMediaFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun média uploadé
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredMediaFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img src={file.url} alt={file.nom} className="w-full h-full object-cover" />
                          ) : (
                            getFileIcon(file.type)
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium truncate">{file.nom}</p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleCopy(file.url, file.id)}
                            >
                              {copiedId === file.id ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Couleurs Tab */}
          {activeTab === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Couleurs</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {defaultColors.map((color, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCopy(color.code, `color-${index}`)}>
                    <CardContent className="p-4">
                      <div
                        className="w-full h-24 rounded-lg mb-3"
                        style={{ backgroundColor: color.code }}
                      />
                      <p className="text-sm font-medium">{color.nom}</p>
                      <p className="text-xs text-muted-foreground font-mono">{color.code}</p>
                      {copiedId === `color-${index}` && (
                        <Badge className="mt-2 bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Copié
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <h4 className="text-md font-semibold mt-8 mb-4">Palettes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultPalettes.map((palette, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCopy(palette.couleurs.join(', '), `palette-${index}`)}>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-3">{palette.nom}</p>
                      <div className="flex gap-2">
                        {palette.couleurs.map((color, colorIndex) => (
                          <div
                            key={colorIndex}
                            className="flex-1 h-16 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {copiedId === `palette-${index}` && (
                        <Badge className="mt-3 bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Copié
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Polices Tab */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Polices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {defaultFonts.map((font, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCopy(font.nom, `font-${index}`)}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">{font.nom}</p>
                          <p className="text-2xl" style={{ fontFamily: font.nom }}>
                            Aa Bb Cc 123
                          </p>
                        </div>
                        {copiedId === `font-${index}` ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComponentsSaved;
