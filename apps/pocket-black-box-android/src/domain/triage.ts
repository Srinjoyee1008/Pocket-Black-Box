import type {TriageSuggestion, Urgency} from './report';

const NEED_TERMS: Array<[string, string[]]> = [
  ['medical', ['injury', 'injured', 'bleeding', 'fever', 'medicine', 'medication', 'medical', 'sick',
    'আহত', 'রক্তপাত', 'জ্বর', 'ওষুধ', 'চিকিৎসা', 'অসুস্থ']],
  ['water', ['water', 'thirst', 'drinking', 'জল', 'পানি', 'তৃষ্ণা']],
  ['food', ['food', 'hungry', 'meal', 'খাবার', 'খাদ্য', 'ক্ষুধা']],
  ['shelter', ['shelter', 'roof', 'tent', 'displaced', 'আশ্রয়', 'ছাদ', 'তাঁবু']],
  ['rescue', ['trapped', 'rescue', 'missing', 'cannot reach', "can't reach", 'আটকে', 'উদ্ধার', 'নিখোঁজ']],
  ['access', ['blocked', 'blocking', 'road', 'path', 'tree', 'রাস্তা', 'অবরুদ্ধ']],
];
const HIGH_TERMS = [
  'urgent', 'critical', 'life-threatening', 'unconscious', 'severe', 'trapped', 'bleeding',
  'জরুরি', 'সংকটজনক', 'অচেতন', 'গুরুতর', 'রক্তপাত',
];

function containsTerm(text: string, term: string): boolean {
  if (/[^\u0000-\u007f]/.test(term)) {
    return text.includes(term);
  }
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
}

export function classifyOffline(text: string): TriageSuggestion {
  const normalized = text.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const needs = NEED_TERMS
    .filter(([, terms]) => terms.some(term => containsTerm(normalized, term)))
    .map(([need]) => need);
  const high = HIGH_TERMS.some(term => containsTerm(normalized, term));
  const urgency: Urgency = high ? 'high' : needs.length ? 'medium' : 'low';
  return {
    suggestions: {urgency, needs},
    confidence: high ? 0.68 : needs.length ? 0.58 : 0.42,
    modelStatus: 'offline-rule-classifier',
  };
}
