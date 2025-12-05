import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e2de53ff`;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
}

async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, token } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || publicAnonKey}`,
  };
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const fullUrl = `${API_BASE}${endpoint}`;
  console.log(`🌐 API Call: ${method} ${fullUrl}`);
  
  const response = await fetch(fullUrl, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
    
    // Handle special error types from backend (USER_BLOCKED, USER_SUSPENDED)
    if (errorData.error === 'USER_BLOCKED' || errorData.error === 'USER_SUSPENDED') {
      throw errorData; // Throw the entire error object with all data
    }
    
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }
  
  return response.json();
}

// ==================== AUTH API ====================

export const authAPI = {
  signup: async (email: string, password: string, name: string) => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: { email, password, name },
    });
  },
  
  signin: async (email: string, password: string) => {
    return apiCall('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
  },
  
  getMe: async (token: string) => {
    return apiCall('/auth/me', { token });
  },
};

// ==================== REPORTS API ====================

export const reportsAPI = {
  create: async (reportData: any, token: string) => {
    return apiCall('/reports', {
      method: 'POST',
      body: reportData,
      token,
    });
  },
  
  getAll: async (token?: string) => {
    return apiCall('/reports', { token });
  },
  
  getById: async (id: string, token?: string) => {
    return apiCall(`/reports/${id}`, { token });
  },
  
  update: async (id: string, updates: any, token: string) => {
    return apiCall(`/reports/${id}`, {
      method: 'PUT',
      body: updates,
      token,
    });
  },
  
  delete: async (id: string, token: string) => {
    return apiCall(`/reports/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  
  getUserReports: async (token: string) => {
    return apiCall('/reports/user/me', { token });
  },
  
  // Follow/Unfollow reports
  follow: async (reportId: string, token: string) => {
    return apiCall(`/reports/${reportId}/follow`, {
      method: 'POST',
      token,
    });
  },
  
  unfollow: async (reportId: string, token: string) => {
    return apiCall(`/reports/${reportId}/follow`, {
      method: 'DELETE',
      token,
    });
  },
  
  isFollowing: async (reportId: string, token: string) => {
    return apiCall(`/reports/${reportId}/follow`, { token });
  },
  
  getFollowedReports: async (userId: string, token: string) => {
    return apiCall(`/users/${userId}/followed-reports`, { token });
  },
};

// ==================== COMMENTS API ====================

export const commentsAPI = {
  add: async (reportId: string, text: string, token: string) => {
    return apiCall(`/reports/${reportId}/comments`, {
      method: 'POST',
      body: { text },
      token,
    });
  },
  
  getAll: async (reportId: string) => {
    return apiCall(`/reports/${reportId}/comments`);
  },
  
  update: async (commentId: string, text: string, token: string) => {
    return apiCall(`/comments/${commentId}`, {
      method: 'PUT',
      body: { text },
      token,
    });
  },
  
  delete: async (commentId: string, token: string) => {
    return apiCall(`/comments/${commentId}`, {
      method: 'DELETE',
      token,
    });
  },
};

// ==================== RATINGS API ====================

export const ratingsAPI = {
  add: async (reportId: string, rating: number, comment: string, token: string) => {
    return apiCall(`/reports/${reportId}/rating`, {
      method: 'POST',
      body: { rating, comment },
      token,
    });
  },
  
  get: async (reportId: string) => {
    return apiCall(`/reports/${reportId}/rating`);
  },
  
  getUserRating: async (reportId: string, token: string) => {
    return apiCall(`/reports/${reportId}/rating/user`, {
      token,
    });
  },
};

// ==================== ENTITIES API ====================

export const entitiesAPI = {
  getAll: async () => {
    return apiCall('/entities');
  },
  
  create: async (entityData: any, token: string) => {
    return apiCall('/entities', {
      method: 'POST',
      body: entityData,
      token,
    });
  },
  
  update: async (entityId: string, entityData: any, token: string) => {
    return apiCall(`/entities/${entityId}`, {
      method: 'PUT',
      body: entityData,
      token,
    });
  },
  
  delete: async (entityId: string, token: string) => {
    return apiCall(`/entities/${entityId}`, {
      method: 'DELETE',
      token,
    });
  },
};

// ==================== ADMIN API ====================

export const publicAPI = {
  getStats: async () => {
    // Public endpoint to get statistics for landing page
    return apiCall('/public/stats');
  },
};

export const aiAPI = {
  classify: async (title: string, description: string, token: string) => {
    return apiCall('/ai/classify', {
      method: 'POST',
      body: { title, description },
      token,
    });
  },
};

export const adminAPI = {
  getAllUsers: async () => {
    // Public endpoint to get user count for landing page
    return apiCall('/admin/users');
  },
  
  getUsers: async (token: string) => {
    return apiCall('/admin/users', { token });
  },
  
  updateUser: async (userId: string, updates: any, token: string) => {
    return apiCall(`/admin/users/${userId}`, {
      method: 'PUT',
      body: updates,
      token,
    });
  },
  
  deleteUser: async (userId: string, token: string) => {
    return apiCall(`/admin/users/${userId}`, {
      method: 'DELETE',
      token,
    });
  },
  
  getAnalytics: async (token: string) => {
    return apiCall('/admin/analytics', { token });
  },
};