import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  FileText, 
  Trash2, 
  Download, 
  Search,
  Plus,
  Eye,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MediaFile {
  id: string;
  nom: string;
  type: string;
  url: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const MediaUpload = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
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
      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Complete progress
      setUploadProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Save to database
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

      await fetchFiles();
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (file: MediaFile) => {
    try {
      // Extract file path from URL
      const url = new URL(file.url);
      const pathSegments = url.pathname.split('/');
      const filePath = pathSegments.slice(-2).join('/'); // user_id/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('assets')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "Fichier supprimé",
        description: `${file.nom} a été supprimé`,
      });

      await fetchFiles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getFileSize = (url: string) => {
    // This is simplified - in a real app you'd store the file size
    return "Taille inconnue";
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

  const filteredFiles = files.filter(file =>
    file.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchFiles();
  }, [user]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Médias</h2>
            <p className="text-muted-foreground">
              Gérez vos images, vidéos, documents et autres fichiers
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,.pdf,.txt,.doc,.docx"
            />
            <Button 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Plus className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fichier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          {/* Upload Zone */}
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
          ) : filteredFiles.length === 0 ? (
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
              {filteredFiles.map((file) => (
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
      </div>
    </div>
  );
};

export default MediaUpload;