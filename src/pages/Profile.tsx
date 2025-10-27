import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Save, Loader2, Camera, Twitter } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFullName(data.full_name || '');
        setEmail(data.email || user.email || '');
        setDescription(data.description || '');
        setTwitterLink(data.twitter_link || '');
        setAvatarUrl(data.avatar_url || '');
      } else {
        setEmail(user.email || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    setUploading(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          email: user.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      toast.success('Photo de profil mise à jour');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          email: user.email,
          description: description,
          twitter_link: twitterLink,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex-1 px-6 py-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Mon Profil
          </h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et votre présence sur la plateforme
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Photo de profil</CardTitle>
            <CardDescription>
              Votre photo de profil est affichée partout sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-xl transition-all group-hover:border-primary/40">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    {getInitials(fullName || user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                     onClick={handleFileSelect}>
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Changez votre photo de profil
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Format: JPG, PNG ou WEBP • Taille max: 5MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleFileSelect}
                  disabled={uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Changer la photo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Informations personnelles</CardTitle>
            <CardDescription>
              Mettez à jour vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Nom complet
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom complet"
                className="bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-muted/50 cursor-not-allowed border-border/30"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié pour des raisons de sécurité
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Parlez-nous un peu de vous..."
                rows={4}
                className="bg-background/50 border-border/50 focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Ajoutez une courte description de vous-même (max. 500 caractères)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter" className="text-sm font-medium flex items-center gap-2">
                <Twitter className="h-4 w-4 text-primary" />
                Lien Twitter/X
              </Label>
              <Input
                id="twitter"
                value={twitterLink}
                onChange={(e) => setTwitterLink(e.target.value)}
                placeholder="https://twitter.com/votreprofil"
                className="bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                onClick={handleUpdateProfile} 
                disabled={loading}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Informations du compte</CardTitle>
            <CardDescription>
              Détails de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <span className="text-sm font-medium text-muted-foreground">ID Utilisateur</span>
              <span className="text-sm font-mono bg-muted/50 px-3 py-1 rounded-md">
                {user?.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border/50">
              <span className="text-sm font-medium text-muted-foreground">Date d'inscription</span>
              <span className="text-sm font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-muted-foreground">Dernière connexion</span>
              <span className="text-sm font-medium">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
