import {classifyOffline} from '../src/domain/triage';

describe('offline triage suggestions', () => {
  it('classifies known English needs and urgent incidents', () => {
    expect(classifyOffline('Urgent medical help and drinking water needed').suggestions).toEqual({
      urgency: 'high',
      needs: ['medical', 'water'],
    });
  });

  it('recognizes Bengali needs and urgent language', () => {
    expect(classifyOffline('জরুরি উদ্ধার দরকার, খাবার ও পানি নেই').suggestions).toEqual({
      urgency: 'high',
      needs: ['water', 'food', 'rescue'],
    });
  });

  it('does not promote unrelated word fragments to needs', () => {
    expect(classifyOffline('The roadway is clear').suggestions).toEqual({
      urgency: 'low',
      needs: [],
    });
  });
});
