// API Client — wraps all backend REST calls
import type {
  Material,
  MaterialDetail,
  CreateMaterialInput,
  Extraction,
  ExtractionFilter,
  ReviewParams,
  UserSettings,
} from '../../shared/types';

const BASE = '/api';

// Auth token management
let _accessToken = localStorage.getItem('access_token') || '';

export function setAccessToken(token: string) {
  _accessToken = token;
  localStorage.setItem('access_token', token);
}

export function getAccessToken(): string {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = '';
  localStorage.removeItem('access_token');
}

export async function verifyPassword(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (_accessToken) {
    headers['x-access-token'] = _accessToken;
  }
  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  });
  if (res.status === 401) {
    clearAccessToken();
    window.location.reload();
    throw new Error('访问密码错误');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getMaterials(): Promise<Material[]> {
  return request<Material[]>('/materials');
}

export function createMaterial(data: CreateMaterialInput): Promise<Material> {
  return request<Material>('/materials', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMaterial(id: number): Promise<MaterialDetail> {
  return request<MaterialDetail>(`/materials/${id}`);
}

export function deleteMaterial(id: number): Promise<void> {
  return request<void>(`/materials/${id}`, { method: 'DELETE' });
}

export function parseMaterial(id: number): Promise<void> {
  return request<void>(`/materials/${id}/parse`, { method: 'POST' });
}

export function translateMaterial(id: number): Promise<{ translations: string[] }> {
  return request<{ translations: string[] }>(`/materials/${id}/translate`, { method: 'POST' });
}

export function getMaterialExtractions(
  id: number,
  filter?: ExtractionFilter,
): Promise<Extraction[]> {
  const params = new URLSearchParams();
  if (filter?.type) params.set('type', filter.type);
  if (filter?.mastery) params.set('mastery', filter.mastery);
  const qs = params.toString();
  return request<Extraction[]>(`/materials/${id}/extractions${qs ? `?${qs}` : ''}`);
}

export function getExtractions(filter?: ExtractionFilter): Promise<Extraction[]> {
  const params = new URLSearchParams();
  if (filter?.type) params.set('type', filter.type);
  if (filter?.mastery) params.set('mastery', filter.mastery);
  if (filter?.sourceTag) params.set('sourceTag', filter.sourceTag);
  const qs = params.toString();
  return request<Extraction[]>(`/extractions${qs ? `?${qs}` : ''}`);
}

export function updateMastery(id: number, mastered: boolean): Promise<Extraction> {
  return request<Extraction>(`/extractions/${id}/mastery`, {
    method: 'PATCH',
    body: JSON.stringify({ mastered }),
  });
}

export function deleteExtraction(id: number): Promise<void> {
  return request<void>(`/extractions/${id}`, { method: 'DELETE' });
}

export function createExtraction(data: {
  materialId: number;
  text: string;
}): Promise<Extraction> {
  return request<Extraction>('/extractions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getReviewCards(params: ReviewParams): Promise<Extraction[]> {
  const qs = new URLSearchParams();
  if (params.materialId) qs.set('materialId', String(params.materialId));
  if (params.type) qs.set('type', params.type);
  const q = qs.toString();
  return request<Extraction[]>(`/extractions/review${q ? `?${q}` : ''}`);
}

export function getSettings(): Promise<UserSettings> {
  return request<UserSettings>('/settings');
}

export function updateSettings(data: UserSettings): Promise<UserSettings> {
  return request<UserSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
