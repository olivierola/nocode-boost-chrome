import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Save, Loader2 } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mon Profil</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos informations personnelles
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Photo de profil</CardTitle>
            <CardDescription>
              Votre photo de profil est affichée partout sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(fullName || user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Format recommandé: JPG ou PNG, taille maximale: 2MB
                </p>
                <Button variant="outline" size="sm" disabled>
                  Changer la photo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Mettez à jour vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                <User className="h-4 w-4 inline mr-2" />
                Nom complet
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Votre nom complet"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                L'email ne peut pas être modifié pour des raisons de sécurité
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleUpdateProfile} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Informations du compte</CardTitle>
            <CardDescription>
              Détails de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">ID Utilisateur</span>
              <span className="text-sm font-mono">{user?.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Date d'inscription</span>
              <span className="text-sm">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Dernière connexion</span>
              <span className="text-sm">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
