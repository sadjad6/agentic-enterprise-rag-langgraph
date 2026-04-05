/** API client — communicates with the FastAPI backend. */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface QueryRequest {
  query: string;
  mode?: 'rag' | 'agent';
  session_id: string;
  access_level?: string;
  anonymize?: boolean;
}

export interface SourceInfo {
  source: string;
  chunk_index: number;
  score: number;
  excerpt: string;
}

export interface QueryResponse {
  answer: string;
  sources: SourceInfo[];
  language: string;
  tokens_used: { input: number; output: number };
  cost_usd: number;
  mode_used: string;
  pii_detected: boolean;
  agent_steps: number;
  tool_results: Array<{ tool: string; args: Record<string, string>; result: string }>;
}

export interface ModeInfo {
  mode: string;
  description: string;
}

export interface HealthStatus {
  status: string;
  mode: string;
  components: Record<string, { status: string; [key: string]: string }>;
}

export interface CostMetrics {
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_model: Record<string, { requests: number; input_tokens: number; output_tokens: number; cost_usd: number }>;
  by_session: Record<string, { requests: number; cost_usd: number }>;
  recent_requests: Array<{
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    timestamp: number;
  }>;
}

export interface DashboardSummary {
  total_conversations: number;
  total_user_messages: number;
  total_assistant_responses: number;
  total_requests: number;
  total_uploads: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  indexed_documents: number;
}

export interface DashboardBreakdownItem {
  name: string;
  requests: number;
  tokens: number;
  cost_usd: number;
}

export interface DashboardActivityPoint {
  date: string;
  queries: number;
  uploads: number;
  tokens: number;
  cost_usd: number;
}

export interface DashboardRecentActivity {
  event_type: 'query' | 'upload';
  created_at: string;
  session_id: string | null;
  query_mode: string | null;
  system_mode: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  filename: string | null;
  chunks_created: number;
  language: string | null;
}

export interface DashboardAnalytics {
  summary: DashboardSummary;
  activity_over_time: DashboardActivityPoint[];
  mode_breakdown: DashboardBreakdownItem[];
  model_breakdown: DashboardBreakdownItem[];
  recent_activity: DashboardRecentActivity[];
  has_data: boolean;
}

export interface UploadResult {
  status: string;
  filename: string;
  chunks_created: number;
  language_detected: string;
  access_level: string;
}

export interface DocumentList {
  documents: string[];
  count: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  return response.json();
}

export const api = {
  query: (data: QueryRequest) =>
    request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  upload: async (file: File, accessLevel = 'public', sessionId?: string): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const search = new URLSearchParams({ access_level: accessLevel });
    if (sessionId) {
      search.set('session_id', sessionId);
    }
    const response = await fetch(
      `${BASE_URL}/upload?${search.toString()}`,
      { method: 'POST', body: formData }
    );
    if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
    return response.json();
  },

  getDocuments: () => request<DocumentList>('/documents'),

  getDocumentPreview: (filename: string) => 
    request<{ filename: string; preview_text: string }>(`/documents/${encodeURIComponent(filename)}/preview`),

  deleteDocument: (filename: string) =>
    request<{ status: string; filename: string }>(`/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),

  getMetrics: () => request<CostMetrics>('/metrics'),

  getDashboardAnalytics: () => request<DashboardAnalytics>('/analytics/dashboard'),

  getHealth: () => request<HealthStatus>('/health'),

  getMode: () => request<ModeInfo>('/mode'),

  setMode: (mode: string) =>
    request<ModeInfo>('/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
};
