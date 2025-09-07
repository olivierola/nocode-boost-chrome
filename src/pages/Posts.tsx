import { useState, useEffect } from 'react';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Copy, Trash2, MessageSquare, Hash, Calendar, Type, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { PostGenerationModal } from '@/components/PostGenerationModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Component as BlueBackground } from '@/components/ui/raycast-animated-blue-background';

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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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

  const renderPostCards = (posts: Post[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard 
            key={post.id}
            post={post}
            onCopy={handleCopyPost}
            onDelete={handleDeletePost}
            onView={setSelectedPost}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0">
        <BlueBackground />
      </div>
      <div className="relative z-10 space-y-6 p-6">
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
              {renderPostCards(todayPosts)}
            </div>
          )}

          {recentPosts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Posts récents</h2>
                <Badge variant="outline">{recentPosts.length}</Badge>
              </div>
              {renderPostCards(recentPosts)}
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

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.subject || "Post"}</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">{selectedPost.tone}</Badge>
                <Badge variant="secondary">{selectedPost.post_type}</Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contenu</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded-md">
                    {selectedPost.content}
                  </p>
                </div>
                
                {selectedPost.metadata.hashtags && selectedPost.metadata.hashtags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Hashtags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPost.metadata.hashtags.map((hashtag, index) => (
                        <Badge key={index} variant="outline" className="text-primary">
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedPost.metadata.cta && (
                  <div>
                    <h4 className="font-medium mb-2">Call to Action</h4>
                    <p className="text-sm bg-muted p-3 rounded-md italic">
                      {selectedPost.metadata.cta}
                    </p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Créé le {format(new Date(selectedPost.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleCopyPost(selectedPost.content)}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copier le contenu
                </Button>
                <Button
                  onClick={() => {
                    handleDeletePost(selectedPost.id);
                    setSelectedPost(null);
                  }}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

interface PostCardProps {
  post: Post;
  onCopy: (content: string) => void;
  onDelete: (postId: string) => void;
  onView: (post: Post) => void;
}

const PostCard = ({ post, onCopy, onDelete, onView }: PostCardProps) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {post.tone}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {post.post_type}
            </Badge>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onView(post);
              }}
              className="h-8 w-8 p-0"
              title="Voir le post complet"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(post.content);
              }}
              className="h-8 w-8 p-0"
              title="Copier le contenu"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Supprimer le post"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-base line-clamp-2">{post.subject}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0" onClick={() => onView(post)}>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed line-clamp-3">
            {post.content}
          </p>
          
          {post.metadata.hashtags && post.metadata.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.metadata.hashtags.slice(0, 3).map((hashtag, index) => (
                <Badge key={index} variant="outline" className="text-xs text-primary">
                  {hashtag}
                </Badge>
              ))}
              {post.metadata.hashtags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.metadata.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              {post.post_type === "linkedin" ? <MessageSquare className="w-3 h-3" /> : 
               post.post_type === "twitter" ? <Hash className="w-3 h-3" /> :
               <Type className="w-3 h-3" />}
              {post.post_type}
            </span>
            <span>
              {format(new Date(post.created_at), 'dd/MM/yyyy', { locale: fr })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Posts;