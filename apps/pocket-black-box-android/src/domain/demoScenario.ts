import type {Report} from './report';

export const DEMO_REPORT_IDS = [
  'demo-sundarbans-rescue',
  'demo-kakdwip-medical',
  'demo-gosaba-water',
  'demo-namkhana-access',
] as const;

export function createDemoReports(now: Date = new Date()): Report[] {
  const timestamp = now.toISOString();
  const reports: Array<Omit<Report, 'created_at' | 'updated_at' | 'revision' | 'sync_state'>> = [
    {
      id: DEMO_REPORT_IDS[0],
      text: '[DEMO] Two residents are trapped on the roof after floodwater entered their home. Elderly person is unconscious and needs medical assessment. Boat rescue requested.',
      location: {latitude: 21.65, longitude: 88.05, area: 'Sagar Island · near Gangasagar'},
      needs: ['medical', 'shelter', 'rescue'],
      urgency: 'high',
      status: 'needs_review',
    },
    {
      id: DEMO_REPORT_IDS[1],
      text: '[DEMO] Injured volunteer with a deep cut at the relief point. Bleeding has slowed; needs first aid and medical assessment.',
      location: {latitude: 22.00, longitude: 88.27, area: 'Kakdwip ferry landing'},
      needs: ['medical'],
      urgency: 'high',
      status: 'open',
    },
    {
      id: DEMO_REPORT_IDS[2],
      text: '[DEMO] Thirty families at the school shelter have no drinking water or food for today. Please send safe water and dry meals.',
      location: {latitude: 22.16, longitude: 88.80, area: 'Gosaba · school shelter'},
      needs: ['water', 'food', 'shelter'],
      urgency: 'medium',
      status: 'assigned',
    },
    {
      id: DEMO_REPORT_IDS[3],
      text: '[DEMO] A fallen tree blocks the only access road to the clinic. No injuries reported on site.',
      location: {latitude: 21.77, longitude: 88.23, area: 'Namkhana · clinic road'},
      needs: ['access'],
      urgency: 'medium',
      status: 'needs_review',
    },
  ];
  return reports.map(report => ({
    ...report,
    created_at: timestamp,
    updated_at: timestamp,
    revision: 1,
    sync_state: 'local',
  }));
}
