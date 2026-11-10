import type {Report, TriageSuggestion} from '../domain/report';
import {classifyOffline} from '../domain/triage';
import {listLocalReports, saveLocalReport, seedDemoReports, updateLocalReport} from './localReports';

type ReportChanges = Partial<Pick<Report, 'urgency' | 'needs' | 'status' | 'location' | 'text'>>;

const listeners = new Set<() => void>();

function notifyChanged(): void {
  listeners.forEach(listener => listener());
}

export const reportRepository = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async list(): Promise<Report[]> {
    return listLocalReports();
  },
  async create(report: Report): Promise<Report> {
    const saved = {...report, sync_state: 'local' as const};
    await saveLocalReport(saved);
    notifyChanged();
    return saved;
  },
  async update(id: string, changes: ReportChanges): Promise<Report | null> {
    const saved = await updateLocalReport(id, changes);
    if (saved) { notifyChanged(); }
    return saved;
  },
  async triage(text: string): Promise<TriageSuggestion> {
    return classifyOffline(text);
  },
  async loadDemoScenario(): Promise<number> {
    const inserted = await seedDemoReports();
    if (inserted > 0) { notifyChanged(); }
    return inserted;
  },
};
