import { useState, useEffect } from 'react';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';
import { Plus, Copy, Trash2, MessageSquare, Hash, Calendar, Type } from 'lucide-react';
import { toast } from 'sonner';
import { PostGenerationModal } from '@/components/PostGenerationModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Post {
  id: string;
  content: string;
  tone: string;
  subject: string;
  post_type: string;
  metadata: {
    hashtags?: string[];
    cta?: string;
    generated_at?: string;
  };
  created_at: string;
}

const Posts = () => {
  const { selectedProject } = useProjectContext();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPosts = async () => {
    if (!selectedProject || !user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_posts_for_project', { 
          p_project_id: selectedProject.id 
        });

      if (error) throw error;
      setPosts((data as Post[]) || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Erreur lors du chargement des posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedProject, user]);

  const handleCopyPost = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Post copié dans le presse-papiers');
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .rpc('delete_post', { p_post_id: postId });

      if (error) throw error;
      
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post supprimé avec succès');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePostsGenerated = (newPosts: Post[]) => {
    setPosts([...newPosts, ...posts]);
    setIsModalOpen(false);
    toast.success(`${newPosts.length} nouveaux posts générés`);
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Sélectionnez un projet pour voir les posts</p>
      </div>
    );
  }

  const today = new Date();
  const todayPosts = posts.filter(post => {
    const postDate = new Date(post.created_at);
    return postDate.toDateString() === today.toDateString();
  });

  const recentPosts = posts.filter(post => {
    const postDate = new Date(post.created_at);
    return postDate.toDateString() !== today.toDateString();
  });

  // Convert posts to BentoGrid items
  const convertPostsToBentoItems = (posts: Post[]): BentoItem[] => {
    return posts.map((post, index) => ({
      title: post.subject || "Post sans titre",
      description: post.content.slice(0, 120) + (post.content.length > 120 ? "..." : ""),
      icon: post.post_type === "linkedin" ? <MessageSquare className="w-4 h-4 text-blue-500" /> : 
            post.post_type === "twitter" ? <Hash className="w-4 h-4 text-sky-500" /> :
            <Type className="w-4 h-4 text-purple-500" />,
      status: post.tone,
      tags: post.metadata?.hashtags ? post.metadata.hashtags.slice(0, 3) : [post.post_type],
      meta: new Date(post.created_at).toLocaleDateString(),
      cta: "Voir →",
      colSpan: index === 0 ? 2 : 1,
      hasPersistentHover: index === 0,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-muted-foreground">
            Générez et gérez vos posts pour {selectedProject.name}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Générer des posts
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Aucun post généré pour ce projet.</p>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="mt-4 gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Générer vos premiers posts
          </Button>
        </Card>
      ) : (
        <>
          {todayPosts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Posts du jour</h2>
                <Badge variant="secondary">{todayPosts.length}</Badge>
              </div>
              <BentoGrid items={convertPostsToBentoItems(todayPosts)} />
            </div>
          )}

          {recentPosts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Posts récents</h2>
                <Badge variant="outline">{recentPosts.length}</Badge>
              </div>
              <BentoGrid items={convertPostsToBentoItems(recentPosts)} />
            </div>
          )}
        </>
      )}

      <PostGenerationModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        projectId={selectedProject.id}
        onPostsGenerated={handlePostsGenerated}
      />
    </div>
  );
};

interface PostCardProps {
  post: Post;
  onCopy: (content: string) => void;
  onDelete: (postId: string) => void;
}

const PostCard = ({ post, onCopy, onDelete }: PostCardProps) => {
  return (
    <Card className="p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {post.tone}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {post.post_type}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCopy(post.content)}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm leading-relaxed">{post.content}</p>
        
        {post.metadata.hashtags && post.metadata.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.metadata.hashtags.map((hashtag, index) => (
              <span key={index} className="text-xs text-blue-600">
                {hashtag}
              </span>
            ))}
          </div>
        )}
        
        {post.metadata.cta && (
          <p className="text-xs text-muted-foreground italic">
            CTA: {post.metadata.cta}
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{post.subject}</span>
        <span>
          {format(new Date(post.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </span>
      </div>
    </Card>
  );
};

export default Posts;