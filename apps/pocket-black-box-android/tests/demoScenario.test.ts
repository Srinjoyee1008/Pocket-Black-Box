import {createDemoReports} from '../src/domain/demoScenario';
import {classifyOffline} from '../src/domain/triage';

describe('Sundarbans demo scenario', () => {
  it('creates a fictional four-report scenario with mapped needs and locations', () => {
    const reports = createDemoReports(new Date('2026-11-05T00:00:00.000Z'));

    expect(reports).toHaveLength(4);
    expect(reports.every(report => report.text.startsWith('[DEMO]'))).toBe(true);
    expect(reports.every(report => report.location?.latitude != null && report.location.longitude != null)).toBe(true);
    expect(new Set(reports.map(report => report.id)).size).toBe(4);
    expect(reports.map(report => report.urgency)).toEqual(['high', 'high', 'medium', 'medium']);
    expect(classifyOffline(reports[0].text).suggestions).toEqual({
      urgency: 'high',
      needs: ['medical', 'shelter', 'rescue'],
    });
  });
});
