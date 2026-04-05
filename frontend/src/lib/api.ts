/** API client — communicates with the FastAPI backend. */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface QueryRequest {
  query: string;
  mode?: 'rag' | 'agent';
  session_id?: string;
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

  upload: async (file: File, accessLevel = 'public'): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(
      `${BASE_URL}/upload?access_level=${encodeURIComponent(accessLevel)}`,
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

  getHealth: () => request<HealthStatus>('/health'),

  getMode: () => request<ModeInfo>('/mode'),

  setMode: (mode: string) =>
    request<ModeInfo>('/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
};
