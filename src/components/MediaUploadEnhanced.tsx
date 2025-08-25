import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image, Video, File, Download, Eye, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MediaFile {
  id: string;
  nom: string;
  type: string;
  url: string;
  created_at: string;
  user_id: string;
  size?: number;
}

const DragDropUpload = ({ onUpload, accept, multiple = true }: {
  onUpload: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onUpload(files);
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files);
    }
  }, [onUpload]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragOver 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium mb-1">
        Glissez vos fichiers ici ou cliquez pour parcourir
      </p>
      <p className="text-xs text-muted-foreground">
        Images, vidéos, PDF, documents... Max 100 Mo
      </p>
      
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
      />
    </div>
  );
};

const MediaUploadEnhanced = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

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
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fichiers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (fileList: FileList) => {
    if (!user) return;

    const filesToUpload = Array.from(fileList);
    const maxSize = 100 * 1024 * 1024; // 100 MB
    
    // Vérifier la taille des fichiers
    for (const file of filesToUpload) {
      if (file.size > maxSize) {
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 100 Mo`,
          variant: "destructive",
        });
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: MediaFile[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        // Save file info to database
        const { data: dbData, error: dbError } = await supabase
          .from('files')
          .insert({
            nom: file.name,
            type: file.type,
            url: publicUrl,
            user_id: user.id
          })
          .select()
          .single();

        if (dbError) throw dbError;

        uploadedFiles.push(dbData);
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      }

      setFiles(prev => [...uploadedFiles, ...prev]);
      
      // Log activity
      if ((window as any).logActivity) {
        (window as any).logActivity('media_uploaded', {
          count: filesToUpload.length,
          types: [...new Set(filesToUpload.map(f => f.type))]
        });
      }

      toast({
        title: "Upload terminé",
        description: `${filesToUpload.length} fichier(s) uploadé(s) avec succès`,
      });
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Erreur d'upload",
        description: "Impossible d'uploader les fichiers",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteFile = async (file: MediaFile) => {
    try {
      // Delete from storage
      const filePath = file.url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('assets')
          .remove([`uploads/${filePath}`]);
      }

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== file.id));
      
      toast({
        title: "Fichier supprimé",
        description: `${file.nom} a été supprimé`,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    }
  };

  const copyAssetTag = (file: MediaFile) => {
    const tag = `{{asset:${file.id}}}`;
    navigator.clipboard.writeText(tag);
    
    toast({
      title: "Tag copié",
      description: `Le tag ${tag} a été copié`,
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getFilePreview = (file: MediaFile) => {
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.url} 
          alt={file.nom}
          className="w-full h-24 object-cover rounded"
        />
      );
    }
    
    if (file.type.startsWith('video/')) {
      return (
        <video 
          src={file.url}
          className="w-full h-24 object-cover rounded"
          controls={false}
        />
      );
    }

    return (
      <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
        {getFileIcon(file.type)}
      </div>
    );
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || 
      (selectedType === 'image' && file.type.startsWith('image/')) ||
      (selectedType === 'video' && file.type.startsWith('video/')) ||
      (selectedType === 'document' && (file.type.includes('pdf') || file.type.includes('document')));
    
    return matchesSearch && matchesType;
  });

  // Load files on component mount
  React.useEffect(() => {
    fetchFiles();
  }, [user]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Médias</h2>
            <p className="text-xs text-muted-foreground">
              Gérez vos assets et utilisez-les dans vos prompts
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Upload Area */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Upload de fichiers</CardTitle>
              <CardDescription className="text-xs">
                Drag & drop ou cliquez pour ajouter des médias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropUpload onUpload={uploadFiles} />
              
              {uploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Upload en cours...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un fichier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'image', 'video', 'document'].map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="text-xs"
                >
                  {type === 'all' ? 'Tous' : 
                   type === 'image' ? 'Images' :
                   type === 'video' ? 'Vidéos' : 'Documents'}
                </Button>
              ))}
            </div>
          </div>

          {/* Files Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {searchTerm ? 'Aucun fichier trouvé' : 'Aucun média uploadé'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="overflow-hidden">
                  <div className="relative">
                    {getFilePreview(file)}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyAssetTag(file)}
                        className="h-6 w-6 p-0"
                        title="Copier le tag"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => deleteFile(file)}
                        className="h-6 w-6 p-0"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium truncate">{file.nom}</h4>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <Badge variant="outline" className="text-xs">
                          {file.type.split('/')[0]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString('fr-FR')}
                      </p>
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

export default MediaUploadEnhanced;