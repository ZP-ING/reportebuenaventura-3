import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { MessageCircle, Send, Trash2, Shield, User as UserIcon, Edit2, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { commentsAPI } from '../utils/api';
import { supabase } from '../utils/supabase/client';

interface Comment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: 'admin' | 'ciudadano';
  text: string;
  createdAt: string;
}

interface CommentsSectionProps {
  reportId: string;
  currentUser: { id: string; name: string; email: string; role: 'admin' | 'ciudadano' };
}

export function CommentsSection({ reportId, currentUser }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const loadComments = async () => {
    try {
      const response = await commentsAPI.getAll(reportId);
      const sortedComments = response.comments.sort((a: Comment, b: Comment) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setComments(sortedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  useEffect(() => {
    loadComments();
    
    const handleCommentUpdate = () => {
      loadComments();
    };
    
    window.addEventListener('commentAdded', handleCommentUpdate);
    
    return () => {
      window.removeEventListener('commentAdded', handleCommentUpdate);
    };
  }, [reportId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Por favor escribe un comentario');
      return;
    }

    if (newComment.trim().length < 3) {
      toast.error('El comentario debe tener al menos 3 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('No estás autenticado');
        setIsSubmitting(false);
        return;
      }

      await commentsAPI.add(reportId, newComment.trim(), token);

      setNewComment('');
      loadComments();
      window.dispatchEvent(new Event('commentAdded'));
      toast.success('Comentario agregado exitosamente');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error al agregar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    // Confirm deletion
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('🗑️ Eliminando comentario:', commentId);
      
      // Try backend first
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await commentsAPI.delete(commentId, token);
          loadComments();
          window.dispatchEvent(new Event('commentAdded'));
          toast.success('Comentario eliminado exitosamente');
          return;
        } catch (apiError) {
          console.warn('⚠️ Backend error, trying Supabase directly:', apiError);
        }
      }
      
      // Fallback to Supabase direct
      const comment = comments.find(c => c.id === commentId);
      if (!comment) {
        toast.error('Comentario no encontrado');
        return;
      }
      
      // Check permissions
      if (comment.userId !== currentUser.id && currentUser.role !== 'admin') {
        toast.error('No tienes permiso para eliminar este comentario');
        return;
      }
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) {
        console.error('Supabase error:', error);
        toast.error('Error al eliminar comentario');
        return;
      }
      
      loadComments();
      window.dispatchEvent(new Event('commentAdded'));
      toast.success('Comentario eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Error al eliminar comentario');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingText.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    if (editingText.trim().length < 3) {
      toast.error('El comentario debe tener al menos 3 caracteres');
      return;
    }

    try {
      console.log('✏️ Editando comentario:', commentId, 'Nuevo texto:', editingText);
      
      // Try backend first
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          await commentsAPI.update(commentId, editingText.trim(), token);
          loadComments();
          window.dispatchEvent(new Event('commentAdded'));
          setEditingCommentId(null);
          setEditingText('');
          toast.success('Comentario editado exitosamente');
          return;
        } catch (apiError) {
          console.warn('⚠️ Backend error, trying Supabase directly:', apiError);
        }
      }
      
      // Fallback to Supabase direct
      const comment = comments.find(c => c.id === commentId);
      if (!comment) {
        toast.error('Comentario no encontrado');
        return;
      }
      
      // Check permissions - only owner can edit
      if (comment.userId !== currentUser.id) {
        toast.error('No tienes permiso para editar este comentario');
        return;
      }
      
      const { error } = await supabase
        .from('comments')
        .update({ text: editingText.trim() })
        .eq('id', commentId);
      
      if (error) {
        console.error('Supabase error:', error);
        toast.error('Error al editar comentario');
        return;
      }
      
      loadComments();
      window.dispatchEvent(new Event('commentAdded'));
      setEditingCommentId(null);
      setEditingText('');
      toast.success('Comentario editado exitosamente');
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('Error al editar comentario');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarColor = (role?: string) => {
    if (role === 'admin') return 'from-purple-500 to-purple-600';
    return 'from-green-500 to-yellow-400';
  };

  return (
    <Card className="border-2 border-green-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b-2 border-green-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-green-800 text-2xl">
            <div className="bg-gradient-to-br from-green-500 to-yellow-400 p-2 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[20px]">Comentarios y Discusión</span>
              <Badge className="ml-3 bg-green-600 text-white text-base px-[27px] py-[0px] mx-[-30px] my-[0px] text-right font-bold">
                {comments.length}
              </Badge>
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Add Comment Section */}
        <div className="space-y-4 p-6 bg-gradient-to-r from-green-50 to-yellow-50 rounded-xl border-2 border-green-200">
          <Label htmlFor="newComment" className="text-base text-green-900">
            Agregar Comentario
          </Label>
          <Textarea
            id="newComment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe tu comentario, pregunta o actualización sobre este reporte..."
            className="border-2 border-green-200 focus:border-green-400 min-h-24 resize-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleAddComment();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 space-y-1">
              <p>Presiona <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> para enviar</p>
              <p className="text-xs text-gray-500">{newComment.length} caracteres</p>
            </div>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isSubmitting}
              className="bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white h-11 px-6 shadow-md text-[20px] rounded-[11px] text-left"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Comentar
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator className="bg-green-200" />

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-700 mb-1">No hay comentarios aún</p>
            <p className="text-base">Sé el primero en comentar sobre este reporte</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment, index) => (
              <div 
                key={comment.id} 
                className="flex gap-4 group animate-in fade-in duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="w-12 h-12 border-2 border-green-200 shadow-md flex-shrink-0">
                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(comment.userRole)} text-white`}>
                    {comment.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base text-gray-900">
                            {comment.userName}
                          </p>
                          {comment.userRole === 'admin' ? (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              <UserIcon className="w-3 h-3 mr-1" />
                              Ciudadano
                            </Badge>
                          )}
                          {comment.userId === currentUser.id && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Tú
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                      </div>
                      <div className="flex gap-1">
                        {comment.userId === currentUser.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-blue-50 hover:text-blue-600 flex-shrink-0 text-blue-500"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingText(comment.text);
                            }}
                            title="Editar comentario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {(comment.userId === currentUser.id || currentUser.role === 'admin') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600 flex-shrink-0 text-red-500"
                            onClick={() => handleDeleteComment(comment.id)}
                            title="Eliminar comentario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          placeholder="Edita tu comentario..."
                          className="border-2 border-green-200 focus:border-green-400 min-h-24 resize-none text-base"
                        />
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Presiona <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> para enviar</p>
                            <p className="text-xs text-gray-500">{editingText.length} caracteres</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditComment(comment.id)}
                              disabled={!editingText.trim()}
                              className="bg-gradient-to-r from-green-500 to-yellow-400 hover:from-green-600 hover:to-yellow-500 text-white h-11 px-6 shadow-md"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Guardar
                            </Button>
                            <Button
                              onClick={() => setEditingCommentId(null)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 h-11 px-6 shadow-md"
                            >
                              <XIcon className="w-4 h-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed text-left text-[16px]">
                        {comment.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}