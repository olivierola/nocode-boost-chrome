import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Monitor, Smartphone, Tablet, Apple, Chrome } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

interface CreateProjectDialogProps {
  children?: React.ReactNode;
}

const PROJECT_TYPES = [
  {
    id: 'web',
    name: 'Application Web',
    description: 'Applications web modernes avec interfaces responsive',
    icon: Monitor,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  },
  {
    id: 'mobile',
    name: 'Application Mobile',
    description: 'Applications mobiles natives ou cross-platform',
    icon: Smartphone,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
  },
  {
    id: 'desktop',
    name: 'Application Desktop',
    description: 'Applications de bureau multiplateformes',
    icon: Tablet,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
  },
  {
    id: 'ios',
    name: 'Application iOS',
    description: 'Applications spécifiques à l\'écosystème Apple',
    icon: Apple,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  },
  {
    id: 'cross-platform',
    name: 'Cross-Platform',
    description: 'Applications fonctionnant sur plusieurs plateformes',
    icon: Chrome,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  }
];

const TECH_STACKS = {
  web: [
    { id: 'react', name: 'React', description: 'Bibliothèque JavaScript pour interfaces utilisateur' },
    { id: 'nextjs', name: 'Next.js', description: 'Framework React avec SSR et génération statique' },
    { id: 'vue', name: 'Vue.js', description: 'Framework JavaScript progressif' },
    { id: 'nuxt', name: 'Nuxt.js', description: 'Framework Vue.js avec SSR' },
    { id: 'angular', name: 'Angular', description: 'Framework web TypeScript complet' },
    { id: 'svelte', name: 'Svelte', description: 'Framework compilé pour applications web rapides' }
  ],
  mobile: [
    { id: 'react-native', name: 'React Native', description: 'Framework mobile basé sur React' },
    { id: 'expo', name: 'Expo', description: 'Plateforme pour développement React Native simplifié' },
    { id: 'flutter', name: 'Flutter', description: 'Framework Google pour apps mobiles cross-platform' },
    { id: 'ionic', name: 'Ionic', description: 'Framework hybride avec web technologies' }
  ],
  desktop: [
    { id: 'electron', name: 'Electron', description: 'Applications desktop avec technologies web' },
    { id: 'tauri', name: 'Tauri', description: 'Framework desktop léger avec Rust' }
  ],
  ios: [
    { id: 'swift', name: 'Swift', description: 'Langage native iOS d\'Apple' },
    { id: 'react-native', name: 'React Native', description: 'Développement cross-platform avec React' },
    { id: 'flutter', name: 'Flutter', description: 'Framework cross-platform de Google' }
  ],
  'cross-platform': [
    { id: 'flutter', name: 'Flutter', description: 'Solution complète cross-platform' },
    { id: 'react-native', name: 'React Native', description: 'JavaScript pour mobile et web' },
    { id: 'expo', name: 'Expo', description: 'Développement rapide cross-platform' },
    { id: 'ionic', name: 'Ionic', description: 'Une base de code, plusieurs plateformes' }
  ]
};

const CreateProjectDialog = ({ children }: CreateProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStack, setSelectedStack] = useState<string>('');
  const { createProject } = useProjects();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedType || !selectedStack) return;
    
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const url = formData.get('url') as string;
    const password = formData.get('password') as string;

    const result = await createProject(
      name, 
      description || undefined, 
      password || undefined,
      url || undefined,
      selectedType,
      selectedStack,
      {
        type_info: PROJECT_TYPES.find(t => t.id === selectedType),
        stack_info: TECH_STACKS[selectedType as keyof typeof TECH_STACKS]?.find(s => s.id === selectedStack)
      }
    );
    
    if (result) {
      setOpen(false);
      // Reset form
      (e.target as HTMLFormElement).reset();
      setSelectedType('');
      setSelectedStack('');
    }
    
    setIsSubmitting(false);
  };

  const selectedTypeData = PROJECT_TYPES.find(t => t.id === selectedType);
  const availableStacks = selectedType ? TECH_STACKS[selectedType as keyof typeof TECH_STACKS] || [] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-3 w-3 mr-1" />
            Nouveau Projet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau projet</DialogTitle>
          <DialogDescription>
            Configurez votre nouveau projet avec ses informations principales
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Mon super projet"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">URL du projet</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://monprojet.com"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Description de votre projet..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe (optionnel)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mot de passe pour les collaborateurs..."
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Si défini, les collaborateurs devront saisir ce mot de passe pour accéder au projet.
              </p>
            </div>
          </div>

          {/* Project Type Selection */}
          <div className="space-y-4">
            <Label>Type d'application *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROJECT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedType === type.id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedType(type.id);
                      setSelectedStack(''); // Reset stack when type changes
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <CardTitle className="text-sm">{type.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        {type.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tech Stack Selection */}
          {selectedType && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label>Stack technique *</Label>
                {selectedTypeData && (
                  <Badge variant="outline" className={selectedTypeData.color}>
                    {selectedTypeData.name}
                  </Badge>
                )}
              </div>
              
              <Select value={selectedStack} onValueChange={setSelectedStack}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisissez votre stack technique" />
                </SelectTrigger>
                <SelectContent>
                  {availableStacks.map((stack) => (
                    <SelectItem key={stack.id} value={stack.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{stack.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {stack.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedType || !selectedStack}
            >
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;