export type Urgency = 'low' | 'medium' | 'high';
export type ReportStatus = 'needs_review' | 'open' | 'assigned' | 'resolved';

export interface Location {
  latitude?: number | null;
  longitude?: number | null;
  area?: string | null;
}

export interface Report {
  id: string;
  text: string;
  location: Location | null;
  needs: string[];
  urgency: Urgency;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  revision: number;
  sync_state: 'local';
}

export interface ReportEvent {
  id: string;
  report_id: string;
  kind: string;
  occurred_at: string;
  revision: number;
  payload: Record<string, unknown>;
}

export interface TriageSuggestion {
  suggestions: {urgency: Urgency; needs: string[]};
  confidence: number;
  modelStatus: string;
}

export interface ApiError {
  error: {code: string; message: string; details?: unknown};
}

export interface SyncEvent {
  eventId: string;
  reportId: string;
  lamport: number;
  deviceId: string;
  payload: Record<string, unknown>;
}
