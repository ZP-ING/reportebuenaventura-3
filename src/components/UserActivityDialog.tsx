import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { FileText, MessageSquare, Star, Eye, MapPin, Calendar, Building2, X, User, Mail, ExternalLink } from 'lucide-react';
import { reportsAPI } from '../utils/api';
import { supabase } from '../utils/supabase/client';

interface UserActivityDialogProps {
  userId: string | null;
  userName: string;
  userEmail: string;
  onClose: () => void;
}

interface Report {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  location?: string; // Address string
  locationLat?: number;
  locationLng?: number;
  entityId?: string;
  entityName?: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  reportId: string;
  reportTitle?: string;
}

interface Rating {
  id: string;
  stars: number;
  createdAt: string;
  reportId: string;
  reportTitle?: string;
}

interface FollowedReport {
  id: string;
  reportId: string;
  report?: Report;
  createdAt: string;
}

export function UserActivityDialog({ userId, userName, userEmail, onClose }: UserActivityDialogProps) {
  const [loading, setLoading] = useState(true);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [userRatings, setUserRatings] = useState<Rating[]>([]);
  const [followedReports, setFollowedReports] = useState<Report[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadUserActivity();
    }
  }, [userId]);

  const loadUserActivity = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Load all data in parallel
      const [reportsRes, entitiesRes] = await Promise.all([
        reportsAPI.getAll(),
        fetch('https://evmgkfifpeyimrjijzou.supabase.co/functions/v1/make-server-e2de53ff/entities', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).catch(() => ({ entities: [] }))
      ]);

      const allReports = reportsRes.reports || [];
      setEntities(entitiesRes.entities || []);

      // Filter user's reports
      const reports = allReports.filter((r: any) => r.userId === userId);
      setUserReports(reports);

      // Load comments directly from Supabase
      try {
        console.log('🔍 Loading comments for user:', userId);
        const { data: comments, error } = await supabase
          .from('comments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error loading comments:', error);
          setUserComments([]);
        } else {
          console.log('📝 Comments loaded:', comments?.length || 0);
          console.log('📝 Sample comment:', comments?.[0]);
          // Add report titles to comments
          const commentsWithTitles = (comments || []).map(c => {
            const report = allReports.find((r: any) => r.id === c.report_id);
            return {
              id: c.id,
              text: c.text,
              createdAt: c.created_at,
              reportId: c.report_id,
              reportTitle: report?.title || 'Reporte eliminado',
              userId: c.user_id
            };
          });
          console.log(`✅ Loaded ${commentsWithTitles.length} comments for user ${userId}`);
          setUserComments(commentsWithTitles);
        }
      } catch (err) {
        console.error('❌ Error loading comments:', err);
        setUserComments([]);
      }

      // Load ratings directly from Supabase
      try {
        console.log('⭐ Loading ratings for user:', userId);
        const { data: ratings, error } = await supabase
          .from('ratings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error loading ratings:', error);
          console.error('❌ Error details:', JSON.stringify(error));
          setUserRatings([]);
        } else {
          console.log('⭐ Ratings loaded:', ratings?.length || 0);
          console.log('⭐ Sample rating:', ratings?.[0]);
          // Add report titles to ratings
          const ratingsWithTitles = (ratings || []).map(r => {
            const report = allReports.find((rep: any) => rep.id === r.report_id);
            return {
              id: r.id,
              stars: r.rating, // The column is called 'rating' not 'stars'
              createdAt: r.created_at,
              reportId: r.report_id,
              reportTitle: report?.title || 'Reporte eliminado',
              userId: r.user_id
            };
          });
          console.log(`✅ Loaded ${ratingsWithTitles.length} ratings for user ${userId}`);
          setUserRatings(ratingsWithTitles);
        }
      } catch (err) {
        console.error('❌ Error loading ratings:', err);
        setUserRatings([]);
      }

      // Load followed reports directly from Supabase
      try {
        console.log('👁️ Loading followed reports for user:', userId);
        const { data: follows, error: followsError } = await supabase
          .from('report_followers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (followsError) {
          console.error('❌ Error loading followed reports:', followsError);
          console.error('❌ Error details:', JSON.stringify(followsError));
          setFollowedReports([]);
        } else {
          console.log('👁️ Followed reports loaded:', follows?.length || 0);
          console.log('👁️ Sample follow:', follows?.[0]);
          
          if (follows && follows.length > 0) {
            // Get the report IDs
            const reportIds = follows.map(f => f.report_id);
            console.log('👁️ Report IDs to fetch:', reportIds);
            
            // Fetch the actual reports
            const { data: reports, error: reportsError } = await supabase
              .from('reports')
              .select('*')
              .in('id', reportIds);
            
            if (reportsError) {
              console.error('❌ Error loading reports:', reportsError);
              setFollowedReports([]);
            } else {
              console.log('👁️ Reports fetched:', reports?.length || 0);
              // Map to Report format
              const followed = (reports || []).map(report => ({
                id: report.id,
                title: report.title,
                description: report.description,
                status: report.status === 'en_proceso' ? 'en-proceso' : report.status,
                createdAt: report.created_at,
                location: report.location_address,
                locationLat: report.location_lat,
                locationLng: report.location_lng,
                entityId: report.entity_id,
                entityName: report.entity_name
              }));
              console.log(`✅ Loaded ${followed.length} followed reports for user ${userId}`);
              setFollowedReports(followed);
            }
          } else {
            setFollowedReports([]);
          }
        }
      } catch (error) {
        console.error('❌ Error loading followed reports:', error);
        setFollowedReports([]);
      }

    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityName = (entityId?: string, entityName?: string) => {
    if (entityName) return entityName;
    if (entityId) {
      const entity = entities.find(e => e.id === entityId);
      return entity?.name || 'Entidad no especificada';
    }
    return 'Entidad no especificada';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'pendiente': { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      'en-proceso': { label: 'En Proceso', className: 'bg-blue-100 text-blue-800' },
      'resuelto': { label: 'Resuelto', className: 'bg-green-100 text-green-800' },
      'rechazado': { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const MiniMap = ({ lat, lng, address }: { lat: number; lng: number; address?: string }) => {
    // Validate coordinates
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      return (
        <div className="h-48 w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <MapPin className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Ubicación no disponible</p>
          </div>
        </div>
      );
    }

    const openStreetMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
    
    return (
      <div className="space-y-2">
        <div className="h-48 w-full rounded-[-81px] overflow-hidden border-2 border-green-200 bg-gray-100">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight={0}
            marginWidth={0}
            src={openStreetMapUrl}
            title="Ubicación del reporte"
            style={{ border: 0 }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
          </span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
          >
            Abrir en OpenStreetMap
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  };

  if (!userId) return null;

  return (
    <Dialog open={!!userId} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] w-screen h-screen border-2 border-green-200 p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b border-green-200 bg-gradient-to-r from-green-50 to-yellow-50 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl text-green-800 mb-2">Actividad del Usuario</DialogTitle>
              <DialogDescription className="text-base">
                Detalles completos de la actividad de {userName}
              </DialogDescription>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{userName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{userEmail}</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-red-50 text-gray-500 hover:text-red-600 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando actividad del usuario...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="reportes" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4 bg-white border-b-2 border-green-200 rounded-none h-auto p-2 flex-shrink-0">
              <TabsTrigger
                value="reportes"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-yellow-400 data-[state=active]:text-white py-3"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Reportes</span>
                <Badge variant="outline" className="ml-1 data-[state=active]:bg-white data-[state=active]:text-green-600">
                  {userReports.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="comentarios"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-yellow-400 data-[state=active]:text-white py-3"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Comentarios</span>
                <Badge variant="outline" className="ml-1">
                  {userComments.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="calificaciones"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-yellow-400 data-[state=active]:text-white py-3"
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">Calificaciones</span>
                <Badge variant="outline" className="ml-1">
                  {userRatings.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="seguidos"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-yellow-400 data-[state=active]:text-white py-3"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">RP Seguidos</span>
                <Badge variant="outline" className="ml-1">
                  {followedReports.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Reportes Tab */}
            <TabsContent value="reportes" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-6">
                {userReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Este usuario no ha creado reportes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userReports.map((report) => (
                      <Card key={report.id} className="border-2 border-green-200 hover:shadow-lg transition-shadow rounded-[-68px]">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-green-800 mb-2">{report.title}</CardTitle>
                              <CardDescription className="text-base">{report.description}</CardDescription>
                            </div>
                            {getStatusBadge(report.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(report.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 className="w-4 h-4" />
                                <span>{getEntityName(report.entityId, report.entityName)}</span>
                              </div>
                              {report.location && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>{report.location}</span>
                                </div>
                              )}
                            </div>
                            {report.locationLat && report.locationLng && (
                              <MiniMap
                                lat={report.locationLat}
                                lng={report.locationLng}
                                address={report.location}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Comentarios Tab */}
            <TabsContent value="comentarios" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-6">
                {userComments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Este usuario no ha realizado comentarios</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userComments.map((comment) => (
                      <Card key={comment.id} className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-base text-blue-800">
                            En reporte: {comment.reportTitle || 'Reporte eliminado'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-gray-700">{comment.text}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(comment.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Calificaciones Tab */}
            <TabsContent value="calificaciones" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-6">
                {userRatings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Este usuario no ha realizado calificaciones</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userRatings.map((rating) => (
                      <Card key={rating.id} className="border-2 border-yellow-200 hover:shadow-lg transition-shadow rounded-[-90px]">
                        <CardHeader>
                          <CardTitle className="text-base text-yellow-800">
                            En reporte: {rating.reportTitle || 'Reporte eliminado'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < rating.stars
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-lg font-semibold text-gray-700">
                              {rating.stars} estrella{rating.stars !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(rating.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Seguidos Tab */}
            <TabsContent value="seguidos" className="flex-1 min-h-0 m-0">
              <ScrollArea className="h-full p-6">
                {followedReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Este usuario no sigue ningún reporte</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {followedReports.map((report) => (
                      <Card key={report.id} className="border-2 border-purple-200 hover:shadow-lg transition-shadow rounded-[-23px] rounded-[-312px]">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-purple-800 mb-2">{report.title}</CardTitle>
                              <CardDescription className="text-base">{report.description}</CardDescription>
                            </div>
                            {getStatusBadge(report.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(report.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building2 className="w-4 h-4" />
                                <span>{getEntityName(report.entityId, report.entityName)}</span>
                              </div>
                              {report.location && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <span>{report.location}</span>
                                </div>
                              )}
                            </div>
                            {report.locationLat && report.locationLng && (
                              <MiniMap
                                lat={report.locationLat}
                                lng={report.locationLng}
                                address={report.location}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}