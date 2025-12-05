// Sistema de seguimiento de reportes con notificaciones
import { reportsAPI } from './api';
import { supabase } from './supabase/client';

export interface FollowedReport {
  reportId: string;
  reportTitle: string;
  lastStatus: string;
  lastCommentCount: number; // Nuevo campo para rastrear comentarios
  followedAt: string;
  userId: string;
}

export interface Notification {
  id: string;
  reportId: string;
  reportTitle: string;
  type: 'status_change' | 'new_comment';
  oldStatus?: string;
  newStatus?: string;
  newCommentsCount?: number;
  timestamp: string;
  read: boolean;
}

const STORAGE_KEY = 'followed_reports';
const NOTIFICATIONS_KEY = 'report_notifications';

// Obtener reportes seguidos por un usuario
export function getFollowedReports(userId: string): FollowedReport[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const allFollowed: FollowedReport[] = JSON.parse(stored);
    return allFollowed.filter(fr => fr.userId === userId);
  } catch (error) {
    console.error('Error loading followed reports:', error);
    return [];
  }
}

// Verificar si un reporte está siendo seguido
export function isReportFollowed(reportId: string, userId: string): boolean {
  // Verificar en localStorage (cache local)
  const followed = getFollowedReports(userId);
  return followed.some(fr => fr.reportId === reportId);
}

// Sincronizar localStorage con la base de datos
export async function syncFollowedReportsFromDB(userId: string): Promise<void> {
  try {
    console.log('🔄 Sincronizando reportes seguidos desde la base de datos...');
    
    // Obtener reportes seguidos desde la base de datos
    const { data: followedData, error } = await supabase
      .from('report_followers')
      .select('report_id, created_at')
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Error syncing from database:', error);
      return;
    }
    
    if (!followedData || followedData.length === 0) {
      console.log('ℹ️ No hay reportes seguidos en la base de datos para sincronizar');
      // Limpiar localStorage si no hay reportes en la BD
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return;
    }
    
    console.log(`📊 ${followedData.length} reportes seguidos encontrados en DB`);
    
    // Obtener detalles de los reportes para el cache
    const reportPromises = followedData.map(async (follow) => {
      try {
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('id, title, status')
          .eq('id', follow.report_id)
          .single();
        
        if (reportError || !reportData) {
          return null;
        }
        
        // Contar comentarios
        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('report_id', follow.report_id);
        
        const followedReport: FollowedReport = {
          reportId: reportData.id,
          reportTitle: reportData.title,
          lastStatus: reportData.status,
          lastCommentCount: comments?.length || 0,
          followedAt: follow.created_at,
          userId: userId
        };
        
        return followedReport;
      } catch (error) {
        console.error(`Error loading report ${follow.report_id}:`, error);
        return null;
      }
    });
    
    const followedReports = (await Promise.all(reportPromises)).filter(r => r !== null) as FollowedReport[];
    
    // Actualizar localStorage con los datos sincronizados
    localStorage.setItem(STORAGE_KEY, JSON.stringify(followedReports));
    console.log(`✅ ${followedReports.length} reportes sincronizados en localStorage`);
  } catch (error) {
    console.error('❌ Error syncing followed reports:', error);
  }
}

// Seguir un reporte - AHORA CON INTEGRACIÓN A BASE DE DATOS
export async function followReport(
  reportId: string,
  reportTitle: string,
  currentStatus: string,
  userId: string,
  currentCommentCount: number = 0
): Promise<boolean> {
  try {
    // Intentar guardar en base de datos
    try {
      console.log(`📡 Intentando seguir reporte ${reportId} en la base de datos...`);
      
      // Verificar si ya está siguiendo en la BD
      const { data: existing, error: checkError } = await supabase
        .from('report_followers')
        .select('id')
        .eq('user_id', userId)
        .eq('report_id', reportId)
        .single();
      
      if (existing) {
        console.log('ℹ️ Ya estás siguiendo este reporte en la base de datos');
        return false;
      }
      
      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('report_followers')
        .insert({
          user_id: userId,
          report_id: reportId
        })
        .select()
        .single();
      
      if (error) {
        // Si el error es de duplicado, no es un error real
        if (error.code === '23505') {
          console.log('ℹ️ Ya estás siguiendo este reporte');
          return false;
        }
        throw error;
      }
      
      console.log('✅ Reporte guardado en la base de datos:', data);
      
      // Guardar en localStorage como cache
      const stored = localStorage.getItem(STORAGE_KEY);
      const allFollowed: FollowedReport[] = stored ? JSON.parse(stored) : [];
      
      const newFollowed: FollowedReport = {
        reportId,
        reportTitle,
        lastStatus: currentStatus,
        lastCommentCount: currentCommentCount,
        followedAt: new Date().toISOString(),
        userId
      };
      
      allFollowed.push(newFollowed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allFollowed));
      console.log('✅ Reporte guardado en localStorage como cache');
      
      return true;
    } catch (error: any) {
      console.error('❌ Error saving to database:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error following report:', error);
    return false;
  }
}

// Dejar de seguir un reporte - AHORA CON INTEGRACIÓN A BASE DE DATOS
export async function unfollowReport(reportId: string, userId: string): Promise<boolean> {
  try {
    // Eliminar de base de datos primero
    try {
      console.log(`📡 Intentando dejar de seguir reporte ${reportId} en la base de datos...`);
      
      const { error } = await supabase
        .from('report_followers')
        .delete()
        .eq('user_id', userId)
        .eq('report_id', reportId);
      
      if (error) throw error;
      
      console.log('✅ Reporte eliminado de la base de datos');
    } catch (error) {
      console.error('❌ Error eliminando de base de datos:', error);
      throw error;
    }
    
    // Eliminar de localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allFollowed: FollowedReport[] = JSON.parse(stored);
      const filtered = allFollowed.filter(
        fr => !(fr.reportId === reportId && fr.userId === userId)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    
    return true;
  } catch (error) {
    console.error('Error unfollowing report:', error);
    return false;
  }
}

// Verificar cambios de estado y generar notificaciones
export interface StatusChangeNotification {
  reportId: string;
  reportTitle: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

export function checkForStatusChanges(
  reports: Array<{ id: string; title: string; status: string }>,
  userId: string
): StatusChangeNotification[] {
  try {
    const followed = getFollowedReports(userId);
    const notifications: StatusChangeNotification[] = [];
    
    for (const report of reports) {
      const followedReport = followed.find(fr => fr.reportId === report.id);
      
      if (followedReport && followedReport.lastStatus !== report.status) {
        notifications.push({
          reportId: report.id,
          reportTitle: report.title,
          oldStatus: followedReport.lastStatus,
          newStatus: report.status,
          timestamp: new Date().toISOString()
        });
        
        // Actualizar el estado en el storage
        updateFollowedReportStatus(report.id, report.status, userId);
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error checking status changes:', error);
    return [];
  }
}

// Actualizar el estado de un reporte seguido
function updateFollowedReportStatus(
  reportId: string,
  newStatus: string,
  userId: string
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allFollowed: FollowedReport[] = JSON.parse(stored);
    const updated = allFollowed.map(fr => {
      if (fr.reportId === reportId && fr.userId === userId) {
        return { ...fr, lastStatus: newStatus };
      }
      return fr;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating followed report status:', error);
  }
}

// Obtener contador de reportes seguidos
export function getFollowedReportsCount(userId: string): number {
  return getFollowedReports(userId).length;
}

// Limpiar reportes antiguos (más de 90 días)
export function cleanOldFollowedReports(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allFollowed: FollowedReport[] = JSON.parse(stored);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const filtered = allFollowed.filter(fr => {
      const followedDate = new Date(fr.followedAt);
      return followedDate > ninetyDaysAgo;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error cleaning old followed reports:', error);
  }
}

// ============== SISTEMA DE NOTIFICACIONES ==============

// Obtener notificaciones de un usuario
export function getNotifications(userId: string): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    
    const allNotifications: Notification[] = JSON.parse(stored);
    return allNotifications.filter(n => {
      // Verificar que el reporte esté siendo seguido
      return isReportFollowed(n.reportId, userId);
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
}

// Obtener notificaciones no leídas
export function getUnreadNotificationsCount(userId: string): number {
  const notifications = getNotifications(userId);
  return notifications.filter(n => !n.read).length;
}

// Marcar notificación como leída
export function markNotificationAsRead(notificationId: string): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return;
    
    const allNotifications: Notification[] = JSON.parse(stored);
    const updated = allNotifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Marcar todas las notificaciones como leídas
export function markAllNotificationsAsRead(userId: string): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return;
    
    const allNotifications: Notification[] = JSON.parse(stored);
    const updated = allNotifications.map(n => {
      if (isReportFollowed(n.reportId, userId)) {
        return { ...n, read: true };
      }
      return n;
    });
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

// Verificar cambios en reportes (estado y comentarios)
export function checkForReportUpdates(
  reports: Array<{ id: string; title: string; status: string; comments?: any[] }>,
  userId: string
): Notification[] {
  try {
    const followed = getFollowedReports(userId);
    const newNotifications: Notification[] = [];
    
    for (const report of reports) {
      const followedReport = followed.find(fr => fr.reportId === report.id);
      
      if (!followedReport) continue;
      
      // Verificar cambio de estado
      if (followedReport.lastStatus !== report.status) {
        const notification: Notification = {
          id: `${report.id}-status-${Date.now()}`,
          reportId: report.id,
          reportTitle: report.title,
          type: 'status_change',
          oldStatus: followedReport.lastStatus,
          newStatus: report.status,
          timestamp: new Date().toISOString(),
          read: false
        };
        newNotifications.push(notification);
        
        // Actualizar estado guardado
        updateFollowedReportStatus(report.id, report.status, userId);
      }
      
      // Verificar nuevos comentarios
      const currentCommentCount = report.comments?.length || 0;
      if (currentCommentCount > followedReport.lastCommentCount) {
        const newCommentsCount = currentCommentCount - followedReport.lastCommentCount;
        const notification: Notification = {
          id: `${report.id}-comment-${Date.now()}`,
          reportId: report.id,
          reportTitle: report.title,
          type: 'new_comment',
          newCommentsCount,
          timestamp: new Date().toISOString(),
          read: false
        };
        newNotifications.push(notification);
        
        // Actualizar contador de comentarios
        updateFollowedReportComments(report.id, currentCommentCount, userId);
      }
    }
    
    // Guardar nuevas notificaciones
    if (newNotifications.length > 0) {
      saveNotifications(newNotifications);
    }
    
    return newNotifications;
  } catch (error) {
    console.error('Error checking for report updates:', error);
    return [];
  }
}

// Actualizar contador de comentarios de un reporte seguido
function updateFollowedReportComments(
  reportId: string,
  commentCount: number,
  userId: string
): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allFollowed: FollowedReport[] = JSON.parse(stored);
    const updated = allFollowed.map(fr => {
      if (fr.reportId === reportId && fr.userId === userId) {
        return { ...fr, lastCommentCount: commentCount };
      }
      return fr;
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating followed report comments:', error);
  }
}

// Guardar nuevas notificaciones
function saveNotifications(notifications: Notification[]): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    const existing: Notification[] = stored ? JSON.parse(stored) : [];
    
    const combined = [...existing, ...notifications];
    
    // Mantener solo las últimas 100 notificaciones
    const limited = combined.slice(-100);
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error saving notifications:', error);
  }
}

// Eliminar notificación
export function deleteNotification(notificationId: string): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return;
    
    const allNotifications: Notification[] = JSON.parse(stored);
    const filtered = allNotifications.filter(n => n.id !== notificationId);
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

// Limpiar notificaciones antiguas (más de 30 días)
export function cleanOldNotifications(): void {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return;
    
    const allNotifications: Notification[] = JSON.parse(stored);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filtered = allNotifications.filter(n => {
      const notificationDate = new Date(n.timestamp);
      return notificationDate > thirtyDaysAgo;
    });
    
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error cleaning old notifications:', error);
  }
}