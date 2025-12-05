import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Calendar, Eye, Bell, BellOff, MessageCircle, ExternalLink, Map, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { ShareButtons } from './ShareButtons';
import { CommentsSection } from './CommentsSection';
import { reportsAPI, commentsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { unfollowReport, isReportFollowed, getFollowedReports } from '../utils/followedReports';
import { supabase } from '../utils/supabase/client';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  locationLat?: number;
  locationLng?: number;
  location?: string;
  images?: string[];
  status: 'pendiente' | 'en-proceso' | 'resuelto' | 'rechazado';
  entityName: string;
  entityId?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  createdAt: string;
  manuallyAssigned?: boolean;
  aiClassification?: {
    confidence: number;
    reasoning: string;
  };
  rating?: number;
  ratingComment?: string;
  // Compatibilidad con formato antiguo
  entity?: string;
  address?: string;
  image?: string;
}

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'en-proceso': { label: 'En Proceso', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  resuelto: { label: 'Resuelto', color: 'bg-green-100 text-green-800 border-green-200' },
  rechazado: { label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200' },
} as const;

type ReportStatus = keyof typeof STATUS_CONFIG;

// Helper function to get status config with fallback
const getStatusConfig = (status: string | undefined) => {
  if (!status || !(status in STATUS_CONFIG)) {
    return STATUS_CONFIG.pendiente; // Default fallback
  }
  return STATUS_CONFIG[status as ReportStatus];
};

interface FollowedReportsProps {
  currentUser: { id: string; email: string; name: string; role: 'admin' | 'ciudadano' };
}

export function FollowedReports({ currentUser }: FollowedReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadFollowedReports();
  }, [currentUser.id]);

  const loadFollowedReports = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Cargando reportes seguidos desde la base de datos...');
      
      // Obtener los IDs de reportes seguidos desde Supabase
      const { data: followedData, error: followError } = await supabase
        .from('report_followers')
        .select('report_id, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      
      if (followError) {
        console.error('❌ Error loading from database:', followError);
        throw followError;
      }
      
      console.log(`📊 ${followedData?.length || 0} reportes seguidos encontrados en DB`);
      
      if (!followedData || followedData.length === 0) {
        console.log('ℹ️ No hay reportes seguidos');
        setReports([]);
        return;
      }
      
      // Obtener los detalles completos de cada reporte
      const reportPromises = followedData.map(async (follow) => {
        try {
          console.log(`📡 Cargando detalles del reporte ${follow.report_id}...`);
          
          // Obtener desde Supabase directamente
          const { data: reportData, error: reportError } = await supabase
            .from('reports')
            .select('*')
            .eq('id', follow.report_id)
            .single();
          
          if (reportError) {
            console.error(`❌ Error loading report ${follow.report_id}:`, reportError);
            return null;
          }
          
          // Obtener información del perfil del usuario que creó el reporte
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', reportData.user_id)
            .single();
          
          // Transformar el formato de Supabase al formato esperado
          const transformedReport: Report = {
            id: reportData.id,
            title: reportData.title,
            description: reportData.description,
            category: reportData.category,
            locationLat: reportData.location_lat,
            locationLng: reportData.location_lng,
            location: reportData.location,
            images: reportData.images || [],
            status: reportData.status,
            entityName: reportData.entity_name,
            entityId: reportData.entity_id,
            userId: reportData.user_id,
            userName: profile?.name || 'Usuario',
            userEmail: profile?.email,
            createdAt: reportData.created_at,
            manuallyAssigned: reportData.manually_assigned,
            aiClassification: reportData.ai_classification,
            rating: reportData.rating,
            ratingComment: reportData.rating_comment,
          };
          
          console.log(`✅ Reporte ${follow.report_id} cargado`);
          return transformedReport;
        } catch (error) {
          console.error(`❌ Error loading report ${follow.report_id}:`, error);
          return null;
        }
      });
      
      const loadedReports = (await Promise.all(reportPromises)).filter(r => r !== null) as Report[];
      console.log(`✅ ${loadedReports.length} reportes cargados exitosamente`);
      
      setReports(loadedReports);
      
    } catch (error: any) {
      console.error('❌ Error loading followed reports:', error);
      toast.error(`Error al cargar reportes seguidos: ${error.message || 'Error desconocido'}`);
      setReports([]); // Mostrar lista vacía en caso de error
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (reportId: string) => {
    const success = await unfollowReport(reportId, currentUser.id);
    if (success) {
      toast.success('Dejaste de seguir este reporte');
      // Recargar la lista
      loadFollowedReports();
    } else {
      toast.error('No se pudo dejar de seguir el reporte');
    }
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

  useEffect(() => {
    // Load comment counts for all reports
    const loadCommentCounts = async () => {
      const counts: Record<string, number> = {};
      for (const report of reports) {
        try {
          const response = await commentsAPI.getAll(report.id);
          counts[report.id] = response.comments.length;
        } catch {
          counts[report.id] = 0;
        }
      }
      setCommentCounts(counts);
    };
    
    if (reports.length > 0) {
      loadCommentCounts();
    }
  }, [reports]);

  const getCommentCount = (reportId: string) => {
    return commentCounts[reportId] || 0;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-green-200 shadow-lg bg-gradient-to-r from-green-50 to-yellow-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Reportes que Sigues
          </CardTitle>
          <CardDescription>
            Recibe notificaciones cuando estos reportes cambien de estado o reciban comentarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p>Cargando reportes seguidos...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-2">No estás siguiendo ningún reporte</p>
              <p className="text-sm">Ve a "Seguir Reporte" para buscar y seguir reportes de tu interés</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow border-2 border-green-100 hover:border-green-300 mb-4">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      {(report.images?.[0] || report.image) && (
                        <div className="w-full sm:w-32 h-32 flex-shrink-0">
                          <img
                            src={report.images?.[0] || report.image}
                            alt={report.title}
                            className="w-full h-full object-cover rounded-lg border-2 border-green-200"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-green-900">{report.title}</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {report.description}
                        </p>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="truncate">{report.location || report.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span>{formatDate(report.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 text-blue-600" />
                            <span>{getCommentCount(report.id)} comentarios</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500">ID: #{report.id}</span>
                            <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
                              {report.entityName || report.entity}
                            </Badge>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Estado Badge */}
                            <Button
                              size="sm"
                              variant="outline"
                              className={`${getStatusConfig(report.status).color} border-2 px-3 py-2 h-9 cursor-default pointer-events-none`}
                            >
                              {getStatusConfig(report.status).label}
                            </Button>
                            
                            <ShareButtons
                              reportId={report.id}
                              reportTitle={report.title}
                              reportDescription={report.description}
                              reportStatus={report.status}
                              reportAddress={report.location || report.address || ''}
                              reportEntity={report.entityName || report.entity || ''}
                              reportImage={report.images?.[0] || report.image}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-200 hover:bg-green-50"
                              onClick={() => setSelectedReport(report)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Ver Detalles</span>
                              <span className="sm:hidden">Ver</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 hover:bg-red-50 text-red-600"
                              onClick={() => handleUnfollow(report.id)}
                            >
                              <BellOff className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Dejar de Seguir</span>
                              <span className="sm:hidden">Dejar</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-[100vw] w-screen h-screen border-2 border-green-200 overflow-y-auto p-0 flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-green-200 bg-gradient-to-r from-green-50 to-yellow-50 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl text-green-800">{selectedReport?.title}</DialogTitle>
                <DialogDescription>Reporte #{selectedReport?.id}</DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedReport(null)}
                className="hover:bg-red-50 text-gray-500 hover:text-red-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 p-6 flex-1 overflow-y-auto">
              {/* Status */}
              <div>
                <Badge className={getStatusConfig(selectedReport.status).color}>
                  {getStatusConfig(selectedReport.status).label}
                </Badge>
              </div>

              {/* Image */}
              {(selectedReport.images?.[0] || selectedReport.image) && (
                <div className="w-full">
                  <img
                    src={selectedReport.images?.[0] || selectedReport.image}
                    alt={selectedReport.title}
                    className="w-full h-64 object-cover rounded-lg border-2 border-green-200"
                  />
                </div>
              )}

              <Separator />

              {/* Details */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-xs text-gray-500 mb-1 text-[20px] font-bold">Título del Reporte</h4>
                  <h3 className="text-lg text-green-900">{selectedReport.title}</h3>
                </div>

                <div>
                  <h4 className="text-xs text-gray-500 mb-1">Descripción</h4>
                  <p className="text-sm leading-relaxed">{selectedReport.description}</p>
                </div>

                <div>
                  <h4 className="text-xs text-gray-500 mb-1">Entidad Responsable</h4>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(selectedReport.entityName || selectedReport.entity || '')} Buenaventura`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 group"
                  >
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer group-hover:border-green-400 transition-colors">
                      {selectedReport.entityName || selectedReport.entity}
                    </Badge>
                    <ExternalLink className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>

                {selectedReport.aiClassification && (
                  <div className="bg-gradient-to-r from-yellow-50 to-green-50 border-2 border-yellow-200 rounded-lg p-3">
                    <h4 className="text-sm text-green-800 mb-2">Clasificación Automática por IA</h4>
                    <p className="text-xs text-gray-600 mb-1">
                      Confianza: {selectedReport.aiClassification.confidence}%
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedReport.aiClassification.reasoning}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs text-gray-500 mb-2 text-[20px]">Ubicación</h4>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReport.location || selectedReport.address || 'Buenaventura Valle del Cauca')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 group mb-3"
                  >
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="hover:underline text-sm">{selectedReport.location || selectedReport.address}</span>
                    <ExternalLink className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>

                  {selectedReport.locationLat && selectedReport.locationLng && (
                    <div className="mt-2 rounded-[-53px] overflow-hidden border-2 border-green-200">
                      <iframe
                        width="100%"
                        height="250"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedReport.locationLng - 0.005},${selectedReport.locationLat - 0.005},${selectedReport.locationLng + 0.005},${selectedReport.locationLat + 0.005}&layer=mapnik&marker=${selectedReport.locationLat},${selectedReport.locationLng}`}
                        className="w-full"
                      ></iframe>
                      <div className="bg-white p-2 text-center border-t-2 border-green-200">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${selectedReport.locationLat}&mlon=${selectedReport.locationLng}#map=16/${selectedReport.locationLat}/${selectedReport.locationLng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 hover:underline inline-flex items-center gap-1"
                        >
                          <Map className="w-3 h-3" />
                          Ver mapa más grande
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs text-gray-500 mb-1">Reportado por</h4>
                  <p className="text-sm">{selectedReport.userName}</p>
                </div>

                <div>
                  <h4 className="text-xs text-gray-500 mb-1">Fecha de Creación</h4>
                  <p className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-600" />
                    {formatDate(selectedReport.createdAt)}
                  </p>
                </div>

                {selectedReport.rating && (
                  <div>
                    <h4 className="text-xs text-gray-500 mb-1">Calificación del Ciudadano</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-lg ${i < selectedReport.rating! ? 'text-yellow-500' : 'text-gray-300'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">({selectedReport.rating}/5)</span>
                    </div>
                    {selectedReport.ratingComment && (
                      <p className="text-sm text-gray-600 mt-1 italic">"{selectedReport.ratingComment}"</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Timeline */}
              <div>
                <h4 className="mb-3 text-green-800 text-[20px]">Historial de Estado</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                    <div>
                      <p className="text-sm">Reporte creado</p>
                      <p className="text-xs text-gray-500">{formatDate(selectedReport.createdAt)}</p>
                    </div>
                  </div>
                  {selectedReport.status !== 'pendiente' && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div>
                        <p className="text-sm">En proceso de atención</p>
                        <p className="text-xs text-gray-500">Por {selectedReport.entityName || selectedReport.entity}</p>
                      </div>
                    </div>
                  )}
                  {selectedReport.status === 'resuelto' && (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                      <div>
                        <p className="text-sm">Reporte resuelto</p>
                        <p className="text-xs text-gray-500">Problema solucionado exitosamente</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Comments Section */}
              <CommentsSection reportId={selectedReport.id} currentUser={currentUser} />

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-2">
                  <ShareButtons
                    reportId={selectedReport.id}
                    reportTitle={selectedReport.title}
                    reportDescription={selectedReport.description}
                    reportStatus={selectedReport.status}
                    reportAddress={selectedReport.location || selectedReport.address || ''}
                    reportEntity={selectedReport.entityName || selectedReport.entity || ''}
                    reportImage={selectedReport.images?.[0] || selectedReport.image}
                    size="lg"
                  />
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleUnfollow(selectedReport.id)}
                    className="border-red-200 hover:bg-red-50 text-red-600"
                  >
                    <BellOff className="w-4 h-4 mr-2" />
                    Dejar de Seguir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}