'use strict';

const STORAGE_KEY = 'pocket-black-box.demo-site.reports.v1';
const NEED_TERMS = {
  medical: ['injury', 'injured', 'bleeding', 'fever', 'medicine', 'medication', 'medical', 'sick', 'আহত', 'রক্তপাত', 'জ্বর', 'ওষুধ', 'চিকিৎসা', 'অসুস্থ'],
  water: ['water', 'thirst', 'drinking', 'জল', 'পানি', 'তৃষ্ণা'],
  food: ['food', 'hungry', 'meal', 'খাবার', 'খাদ্য', 'ক্ষুধা'],
  shelter: ['shelter', 'roof', 'tent', 'displaced', 'আশ্রয়', 'ছাদ', 'তাঁবু'],
  rescue: ['trapped', 'rescue', 'missing', 'cannot reach', "can't reach", 'আটকে', 'উদ্ধার', 'নিখোঁজ'],
  access: ['blocked', 'blocking', 'road', 'path', 'tree', 'রাস্তা', 'অবরুদ্ধ'],
};
const HIGH_TERMS = ['urgent', 'critical', 'life-threatening', 'unconscious', 'severe', 'trapped', 'bleeding', 'জরুরি', 'সংকটজনক', 'অচেতন', 'গুরুতর', 'রক্তপাত'];
const DEMO_REPORTS = [
  {
    id: 'demo-sundarbans-rescue',
    text: '[DEMO] Two residents are trapped on the roof after floodwater entered their home. Elderly person is unconscious and needs medical assessment. Boat rescue requested.',
    area: 'Sagar Island · near Gangasagar', latitude: 21.65, longitude: 88.05,
    needs: ['medical', 'shelter', 'rescue'], urgency: 'high', status: 'needs_review',
  },
  {
    id: 'demo-kakdwip-medical',
    text: '[DEMO] Injured volunteer with a deep cut at the relief point. Bleeding has slowed; needs first aid and medical assessment.',
    area: 'Kakdwip ferry landing', latitude: 22.00, longitude: 88.27,
    needs: ['medical'], urgency: 'high', status: 'open',
  },
  {
    id: 'demo-gosaba-water',
    text: '[DEMO] Thirty families at the school shelter have no drinking water or food for today. Please send safe water and dry meals.',
    area: 'Gosaba · school shelter', latitude: 22.16, longitude: 88.80,
    needs: ['water', 'food', 'shelter'], urgency: 'medium', status: 'assigned',
  },
  {
    id: 'demo-namkhana-access',
    text: '[DEMO] A fallen tree blocks the only access road to the clinic. No injuries reported on site.',
    area: 'Namkhana · clinic road', latitude: 21.77, longitude: 88.23,
    needs: ['access'], urgency: 'medium', status: 'needs_review',
  },
];
const STATUS_LABELS = {needs_review: 'Needs review', open: 'Open', assigned: 'Assigned', resolved: 'Resolved'};
const NEED_LABELS = {medical: 'Medical', rescue: 'Rescue', food: 'Food', water: 'Water', shelter: 'Shelter', access: 'Access'};
const state = {reports: [], filter: 'all', search: ''};
const notice = document.getElementById('storage-notice');
const dialogNotice = document.getElementById('dialog-notice');
const dialog = document.getElementById('report-dialog');
const form = document.getElementById('report-form');

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
  if (dialog.open) {
    dialogNotice.textContent = message;
    dialogNotice.hidden = false;
  }
}

function clearNotice() {
  notice.textContent = '';
  notice.hidden = true;
  dialogNotice.textContent = '';
  dialogNotice.hidden = true;
}

function loadReports() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];
    const parsed = JSON.parse(stored);
    const invalidReport = report => !report
      || typeof report.id !== 'string'
      || typeof report.text !== 'string'
      || !Array.isArray(report.needs)
      || !['high', 'medium', 'low'].includes(report.urgency)
      || !Object.hasOwn(STATUS_LABELS, report.status)
      || (report.latitude != null && !Number.isFinite(report.latitude))
      || (report.longitude != null && !Number.isFinite(report.longitude));
    if (!Array.isArray(parsed) || parsed.some(invalidReport)) {
      throw new Error('Saved reports have an unexpected format.');
    }
    return parsed;
  } catch (error) {
    showNotice(`Saved reports could not be read: ${error.message} Your browser data was not changed.`);
    return [];
  }
}

function persist(nextReports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReports));
    state.reports = nextReports;
    clearNotice();
    render();
    return true;
  } catch (error) {
    showNotice(`This change could not be saved in browser storage: ${error.message} Check available storage and try again.`);
    return false;
  }
}

function normalizeText(text) {
  return text.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function hasTerm(text, term) {
  if (/[^\u0000-\u007f]/.test(term)) return text.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function classifyOffline(text) {
  const normalized = normalizeText(text);
  const needs = Object.entries(NEED_TERMS)
    .filter(([, terms]) => terms.some(term => hasTerm(normalized, term)))
    .map(([need]) => need);
  const high = HIGH_TERMS.some(term => hasTerm(normalized, term));
  return {urgency: high ? 'high' : needs.length ? 'medium' : 'low', needs};
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function formatTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'}).format(date);
}

function needsAttention(report) {
  return report.urgency === 'high' || report.status === 'needs_review';
}

function visibleReports() {
  const query = normalizeText(state.search);
  return state.reports.filter(report => {
    const filterMatches = state.filter === 'all'
      || (state.filter === 'high' && report.urgency === 'high')
      || (state.filter === 'needs_review' && report.status === 'needs_review')
      || (state.filter === 'resolved' && report.status === 'resolved');
    const searchMatches = !query || normalizeText(`${report.text} ${report.area || ''} ${(report.needs || []).join(' ')}`).includes(query);
    return filterMatches && searchMatches;
  }).sort((a, b) => {
    const urgency = {high: 0, medium: 1, low: 2};
    return urgency[a.urgency] - urgency[b.urgency] || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });
}

function renderMetrics() {
  const active = state.reports.filter(report => report.status !== 'resolved');
  document.getElementById('metric-total').textContent = String(active.length);
  document.getElementById('metric-attention').textContent = String(active.filter(report => report.urgency === 'high').length);
  document.getElementById('metric-review').textContent = String(active.filter(report => report.status === 'needs_review').length);
  document.getElementById('metric-located').textContent = String(active.filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude)).length);
}

function renderPriorityQueue() {
  const reports = state.reports.filter(needsAttention)
    .sort((a, b) => {
      const urgency = {high: 0, medium: 1, low: 2};
      return urgency[a.urgency] - urgency[b.urgency] || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    }).slice(0, 3);
  document.getElementById('queue-count').textContent = String(reports.length);
  const container = document.getElementById('priority-list');
  if (!reports.length) {
    container.innerHTML = '<div class="priority-empty"><strong>Room to breathe.</strong><span>No reports currently need attention.</span></div>';
    return;
  }
  container.innerHTML = reports.map(report => {
    const heading = report.area || report.text.replace(/^\[DEMO\]\s*/, '').slice(0, 55);
    return `<article class="priority-item">
      <div class="priority-item-top"><span class="mini-priority ${report.urgency}">${escapeHtml(report.urgency.toUpperCase())}</span><span class="priority-title">${escapeHtml(heading)}</span></div>
      <p>${escapeHtml(report.text.replace(/^\[DEMO\]\s*/, ''))}</p>
    </article>`;
  }).join('');
}

function renderMap() {
  const located = state.reports.filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude));
  document.getElementById('map-count').textContent = String(located.length);
  document.getElementById('map-empty').hidden = located.length > 0;
  const bounds = located.reduce((acc, report) => ({
    minLat: Math.min(acc.minLat, report.latitude), maxLat: Math.max(acc.maxLat, report.latitude),
    minLon: Math.min(acc.minLon, report.longitude), maxLon: Math.max(acc.maxLon, report.longitude),
  }), {minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity});
  const spanLat = bounds.maxLat - bounds.minLat || 1;
  const spanLon = bounds.maxLon - bounds.minLon || 1;
  const points = located.map((report, index) => {
    const x = 9 + ((report.longitude - bounds.minLon) / spanLon) * 82;
    const y = 12 + ((bounds.maxLat - report.latitude) / spanLat) * 70;
    const short = report.demo ? `D${index + 1}` : String(index + 1);
    const label = `${report.urgency} priority: ${report.area || 'Field report'}`;
    return `<a class="map-point ${escapeHtml(report.urgency)}" style="left:${x}%;top:${y}%" href="#report-${encodeURIComponent(report.id)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${short}</a>`;
  });
  document.getElementById('map-points').innerHTML = points.join('');
}

function reportRow(report) {
  const needs = (report.needs || []).map(need => `<span class="need-tag">${escapeHtml(NEED_LABELS[need] || need)}</span>`).join('');
  const demo = report.demo ? '<span class="demo-tag">FICTIONAL DEMO</span>' : '';
  const area = report.area ? `<span>⌖ ${escapeHtml(report.area)}</span>` : '<span>⌖ Area not specified</span>';
  const time = formatTime(report.createdAt);
  return `<article class="report-row" id="report-${encodeURIComponent(report.id)}">
    <div class="report-main">
      <div class="report-title-line"><span class="urgency-chip ${escapeHtml(report.urgency)}">${escapeHtml(report.urgency.toUpperCase())}</span>${demo}</div>
      <p class="report-text">${escapeHtml(report.text.replace(/^\[DEMO\]\s*/, ''))}</p>
      <div class="report-meta">${area}<span>·</span><span>${escapeHtml(time)}</span>${needs}</div>
    </div>
    <label class="sr-only" for="urgency-${escapeHtml(report.id)}">Urgency for report at ${escapeHtml(report.area || 'unspecified area')}</label>
    <select class="row-select urgency-${escapeHtml(report.urgency)}" id="urgency-${escapeHtml(report.id)}" data-report="${escapeHtml(report.id)}" data-field="urgency" aria-label="Urgency">
      <option value="high" ${report.urgency === 'high' ? 'selected' : ''}>High priority</option>
      <option value="medium" ${report.urgency === 'medium' ? 'selected' : ''}>Medium priority</option>
      <option value="low" ${report.urgency === 'low' ? 'selected' : ''}>Low priority</option>
    </select>
    <label class="sr-only" for="status-${escapeHtml(report.id)}">Status for report at ${escapeHtml(report.area || 'unspecified area')}</label>
    <select class="row-select" id="status-${escapeHtml(report.id)}" data-report="${escapeHtml(report.id)}" data-field="status" aria-label="Volunteer status">
      ${Object.entries(STATUS_LABELS).map(([key, label]) => `<option value="${key}" ${report.status === key ? 'selected' : ''}>${label}</option>`).join('')}
    </select>
  </article>`;
}

function renderReportList() {
  const reports = visibleReports();
  const list = document.getElementById('report-list');
  list.innerHTML = reports.map(reportRow).join('');
  document.getElementById('all-count').textContent = String(state.reports.length);
  const empty = document.getElementById('reports-empty');
  empty.hidden = reports.length > 0;
  if (!reports.length && (state.reports.length > 0 || state.search || state.filter !== 'all')) {
    empty.querySelector('strong').textContent = 'No reports match this view';
    empty.querySelector('span:nth-of-type(2)').textContent = 'Try a different filter or search term.';
    empty.querySelector('.button').hidden = true;
  } else {
    empty.querySelector('strong').textContent = 'Your local field log starts here';
    empty.querySelector('span:nth-of-type(2)').textContent = 'Load the fictional Sundarbans scenario or record a new report. Nothing is sent to a server.';
    empty.querySelector('.button').hidden = false;
  }
}

function render() {
  renderMetrics();
  renderPriorityQueue();
  renderMap();
  renderReportList();
}

function addDemoReports() {
  const existing = new Set(state.reports.map(report => report.id));
  const now = new Date().toISOString();
  const additions = DEMO_REPORTS.filter(report => !existing.has(report.id)).map(report => ({
    ...report, needs: [...report.needs], demo: true, createdAt: now, updatedAt: now,
  }));
  if (!additions.length) {
    showNotice('The four demo reports are already in this browser. Your existing report edits are unchanged.');
    return;
  }
  if (persist([...state.reports, ...additions])) {
    showNotice(`Added ${additions.length} fictional demo report${additions.length === 1 ? '' : 's'} to this browser.`);
    window.setTimeout(clearNotice, 4500);
  }
}

function updateReport(id, field, value) {
  const next = state.reports.map(report => report.id === id
    ? {...report, [field]: value, updatedAt: new Date().toISOString()}
    : report);
  persist(next);
}

function suggestTriage() {
  const text = document.getElementById('report-text').value;
  if (!text.trim()) {
    showNotice('Enter a short report first, then ask for offline triage suggestions.');
    document.getElementById('report-text').focus();
    return;
  }
  const suggestion = classifyOffline(text);
  document.getElementById('report-urgency').value = suggestion.urgency;
  const suggested = new Set(suggestion.needs);
  form.querySelectorAll('input[name="need"]').forEach(input => { input.checked = suggested.has(input.value); });
  showNotice(`Local keyword suggestion: ${suggestion.urgency} urgency and ${suggestion.needs.length ? suggestion.needs.join(', ') : 'no matched needs'}. Please review; this is not a diagnosis.`);
}

function saveNewReport(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const text = document.getElementById('report-text').value.trim();
  const latitudeValue = document.getElementById('report-latitude').value.trim();
  const longitudeValue = document.getElementById('report-longitude').value.trim();
  if ((latitudeValue && !longitudeValue) || (!latitudeValue && longitudeValue)) {
    showNotice('Enter both coordinates, or leave both coordinate fields blank.');
    return;
  }
  const report = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    area: document.getElementById('report-area').value.trim(),
    latitude: latitudeValue ? Number(latitudeValue) : null,
    longitude: longitudeValue ? Number(longitudeValue) : null,
    needs: [...form.querySelectorAll('input[name="need"]:checked')].map(input => input.value),
    urgency: document.getElementById('report-urgency').value,
    status: document.getElementById('report-status').value,
    demo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (persist([report, ...state.reports])) {
    dialog.close();
    form.reset();
    document.getElementById('report-status').value = 'needs_review';
    document.getElementById('report-urgency').value = 'medium';
    document.getElementById('search-input').value = '';
    state.search = '';
    state.filter = 'all';
    document.querySelectorAll('.filter-button').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
    renderReportList();
    showNotice('Report saved to this browser only. Triage suggestions are volunteer-reviewed.');
    window.setTimeout(clearNotice, 4500);
  }
}

document.getElementById('new-report-button').addEventListener('click', () => dialog.showModal());
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.getElementById('load-demo-button').addEventListener('click', addDemoReports);
document.getElementById('empty-demo-button').addEventListener('click', addDemoReports);
document.getElementById('suggest-button').addEventListener('click', suggestTriage);
form.addEventListener('submit', saveNewReport);
document.getElementById('search-input').addEventListener('input', event => { state.search = event.target.value; renderReportList(); });
document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
  renderReportList();
}));
document.getElementById('report-text').addEventListener('input', clearNotice);
dialog.addEventListener('close', clearNotice);
document.getElementById('report-list').addEventListener('change', event => {
  const control = event.target.closest('[data-report][data-field]');
  if (control) updateReport(control.dataset.report, control.dataset.field, control.value);
});
document.getElementById('current-time').textContent = new Intl.DateTimeFormat(undefined, {weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'}).format(new Date());
state.reports = loadReports();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./service-worker.js').catch(error => {
    showNotice(`Offline caching could not be enabled: ${error.message} The site still works while this tab is open.`);
  });
}
