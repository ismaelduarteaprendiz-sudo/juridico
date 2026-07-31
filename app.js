(() => {
'use strict';

/* =========================================================
   COLUMN DEFINITIONS (ordem exata das 31 colunas do XLSX)
   ========================================================= */
const COLUMNS = [
  { key: 'id',                           label: 'ID',                  type: 'number', editable: false, defaultVisible: true,  width: 55  },
  { key: 'processo',                     label: 'Processo',            type: 'text',   editable: false, defaultVisible: true,  width: 190 },
  { key: 'vara',                         label: 'Vara',                type: 'text',   editable: false, defaultVisible: false },
  { key: 'comarca',                      label: 'Comarca',              type: 'text',   editable: false, defaultVisible: true  },
  { key: 'instituicao',                  label: 'Instituição',          type: 'text',   editable: false, defaultVisible: true  },
  { key: 'unidade',                      label: 'Unidade',              type: 'text',   editable: false, defaultVisible: false },
  { key: 'autor',                        label: 'Autor',                type: 'text',   editable: false, defaultVisible: true  },
  { key: 'funcao',                       label: 'Função',               type: 'text',   editable: false, defaultVisible: false },
  { key: 'causaDePedir',                 label: 'Causa de Pedir',       type: 'text',   editable: false, defaultVisible: false },
  { key: 'valorPedido',                  label: 'Valor Pedido',         type: 'currency', editable: false, defaultVisible: false },
  { key: 'valorEstimado',                label: 'Valor Estimado',       type: 'currency', editable: false, defaultVisible: false },
  { key: 'valorSentenciado',             label: 'Valor Sentenciado',    type: 'currency', editable: false, defaultVisible: false },
  { key: 'valorAcordo',                  label: 'Valor Acordo',         type: 'currency', editable: false, defaultVisible: false },
  { key: 'contibuicoesPrevidenciarios',  label: 'Contrib. Previdenc.',  type: 'currency', editable: false, defaultVisible: false },
  { key: 'custasJudiciais',              label: 'Custas Judiciais',     type: 'currency', editable: false, defaultVisible: false },
  { key: 'depositoRecursal',             label: 'Depósito Recursal',    type: 'currency', editable: false, defaultVisible: false },
  { key: 'irpf/outros',                  label: 'IRPF/Outros',          type: 'currency', editable: false, defaultVisible: false },
  { key: 'honorarios',                   label: 'Honorários',           type: 'currency', editable: false, defaultVisible: false },
  { key: 'setenciado',                   label: 'Total Sentenciado',    type: 'currency', editable: false, defaultVisible: true, computed: true },
  { key: 'statusPagamento',              label: 'Status Pagamento',     type: 'text',   editable: true,  defaultVisible: true  },
  { key: 'status',                       label: 'Status',               type: 'status', editable: true,  defaultVisible: true  },
  { key: 'dataEntradaEstagio',           label: 'Entrada no Estágio',   type: 'date',   editable: false, defaultVisible: false },
  { key: 'advogado',                     label: 'Advogado',             type: 'text',   editable: true,  defaultVisible: true  },
  { key: 'dataNotificacao',              label: 'Data Notificação',     type: 'text',   editable: false, defaultVisible: false },
  { key: 'tempoServico',                 label: 'Tempo de Serviço',     type: 'text',   editable: false, defaultVisible: false },
  { key: 'adicionais',                   label: 'Adicionais',           type: 'text',   editable: false, defaultVisible: false },
  { key: 'reintegracao',                 label: 'Reintegração',         type: 'text',   editable: false, defaultVisible: false },
  { key: 'prestadorColaborador',         label: 'Prestador/Colaborador',type: 'text',   editable: false, defaultVisible: false },
  { key: 'prazo',                        label: 'Prazo',                type: 'date',   editable: true,  defaultVisible: true  },
  { key: 'observacoes',                  label: 'Observações',          type: 'textarea', editable: true, defaultVisible: true },
  { key: 'anoOrigem',                    label: 'Ano Origem',           type: 'text',   editable: false, defaultVisible: false },
];

const VALUE_FIELDS_FOR_SETENCIADO = [
  'valorSentenciado', 'valorAcordo', 'contibuicoesPrevidenciarios',
  'custasJudiciais', 'depositoRecursal', 'irpf/outros', 'honorarios'
];

const STATUS_OPTIONS = [
  'Notificação', 'Em andamento', 'Sentenciado ou Acordo', 'Recurso', 'Concluído', 'Arquivado'
];

const STATUS_BADGE_CLASS = {
  'Notificação': 'badge-notificacao',
  'Em andamento': 'badge-emandamento',
  'Sentenciado ou Acordo': 'badge-sentenciadoacordo',
  'Recurso': 'badge-recurso',
  'Concluído': 'badge-concluido',
  'Arquivado': 'badge-arquivado',
};

const PAGE_SIZE = 50;

/* =========================================================
   INDEXEDDB HELPERS
   ========================================================= */
const DB_NAME = 'op-casos-db';
const DB_STORE = 'kv';

function dbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
    req.onerror = () => reject(req.error);
  });
}

async function dbSet(key, value) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put({ key, value });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================================================
   APP STATE
   ========================================================= */
const state = {
  activeTab: 'casos',
  data: { casos: [], log: [] },
  headerLegend: null,
  visibleColumns: new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key)),
  filters: { status: '', instituicao: '', comarca: '', advogado: '', search: '',
             entradaFrom: '', entradaTo: '', prazoFrom: '', prazoTo: '' },
  sort: { key: null, dir: 1 },
  page: 1,
};

/* =========================================================
   UTILITIES
   ========================================================= */
function toast(msg, isError) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.toggle('error', !!isError);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3400);
}

function computeSetenciado(row) {
  let sum = 0;
  for (const f of VALUE_FIELDS_FOR_SETENCIADO) {
    const v = row[f];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

function recalcAll(rows) {
  rows.forEach(r => { r.setenciado = computeSetenciado(r); });
}

function fmtCurrency(v) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && v === 0)) return '';
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function badgeHtml(status) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge-arquivado';
  return `<span class="badge ${cls}">${escapeHtml(status || '—')}</span>`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function splitMulti(val) {
  if (!val) return [];
  return String(val).split(',').map(s => s.trim()).filter(Boolean);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
async function init() {
  const storedCasos = await dbGet('casos');
  const storedLog = await dbGet('log');
  const storedHL = await dbGet('header_legend');

  if (storedCasos && storedLog) {
    state.data.casos = storedCasos;
    state.data.log = storedLog;
    state.headerLegend = storedHL || window.HEADER_LEGEND;
  } else {
    state.data.casos = JSON.parse(JSON.stringify(window.SEED_DATA.casos));
    state.data.log = JSON.parse(JSON.stringify(window.SEED_DATA.log));
    state.headerLegend = window.HEADER_LEGEND;
    await persistAll();
  }

  recalcAll(state.data.casos);
  recalcAll(state.data.log);

  buildColumnsPanel();
  buildFilterOptions();
  bindEvents();
  renderAll();
}

async function persistAll() {
  await dbSet('casos', state.data.casos);
  await dbSet('log', state.data.log);
  await dbSet('header_legend', state.headerLegend);
}

/* =========================================================
   FILTER OPTIONS (populated from data)
   ========================================================= */
function buildFilterOptions() {
  const rows = [...state.data.casos, ...state.data.log];
  const instituicoes = new Set();
  const comarcas = new Set();
  const advogados = new Set();

  rows.forEach(r => {
    splitMulti(r.instituicao).forEach(v => instituicoes.add(v.toUpperCase()));
    if (r.comarca) comarcas.add(String(r.comarca).trim());
    if (r.advogado) advogados.add(String(r.advogado).trim());
  });

  fillSelect('filterStatus', STATUS_OPTIONS, 'Status: Todos');
  fillSelect('filterInstituicao', [...instituicoes].sort(), 'Instituição: Todas');
  fillSelect('filterComarca', [...comarcas].sort(), 'Comarca: Todas');
  fillSelect('filterAdvogado', [...advogados].sort(), 'Advogado: Todos');
}

function fillSelect(id, values, placeholder) {
  const el = document.getElementById(id);
  const current = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  el.value = current && values.includes(current) ? current : '';
}

/* =========================================================
   COLUMNS PANEL
   ========================================================= */
function buildColumnsPanel() {
  const grid = document.getElementById('columnsGrid');
  grid.innerHTML = COLUMNS.map(c => `
    <label>
      <input type="checkbox" data-col="${c.key}" ${state.visibleColumns.has(c.key) ? 'checked' : ''}>
      ${escapeHtml(c.label)}
    </label>
  `).join('');
  grid.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.visibleColumns.add(cb.dataset.col);
      else state.visibleColumns.delete(cb.dataset.col);
      renderTable();
    });
  });
}

/* =========================================================
   FILTERING & SORTING
   ========================================================= */
function getActiveRows() {
  return state.activeTab === 'casos' ? state.data.casos : state.data.log;
}

function applyFilters(rows) {
  const f = state.filters;
  return rows.filter(r => {
    if (f.status && r.status !== f.status) return false;
    if (f.instituicao) {
      const list = splitMulti(r.instituicao).map(v => v.toUpperCase());
      if (!list.includes(f.instituicao.toUpperCase())) return false;
    }
    if (f.comarca && String(r.comarca || '').trim() !== f.comarca) return false;
    if (f.advogado && String(r.advogado || '').trim() !== f.advogado) return false;

    if (f.entradaFrom && (!r.dataEntradaEstagio || r.dataEntradaEstagio < f.entradaFrom)) return false;
    if (f.entradaTo && (!r.dataEntradaEstagio || r.dataEntradaEstagio > f.entradaTo)) return false;
    if (f.prazoFrom && (!r.prazo || r.prazo < f.prazoFrom)) return false;
    if (f.prazoTo && (!r.prazo || r.prazo > f.prazoTo)) return false;

    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [r.processo, r.autor, r.observacoes].map(v => (v || '').toString().toLowerCase()).join(' | ');
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function applySort(rows) {
  if (!state.sort.key) return rows;
  const { key, dir } = state.sort;
  const col = COLUMNS.find(c => c.key === key);
  const sorted = [...rows].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (col && (col.type === 'number' || col.type === 'currency')) {
      av = typeof av === 'number' ? av : -Infinity;
      bv = typeof bv === 'number' ? bv : -Infinity;
      return (av - bv) * dir;
    }
    av = (av === null || av === undefined) ? '' : String(av);
    bv = (bv === null || bv === undefined) ? '' : String(bv);
    return av.localeCompare(bv, 'pt-BR') * dir;
  });
  return sorted;
}

function getFilteredSortedRows() {
  return applySort(applyFilters(getActiveRows()));
}

/* =========================================================
   RENDERING
   ========================================================= */
function renderAll() {
  document.getElementById('countCasos').textContent = state.data.casos.length;
  document.getElementById('countLog').textContent = state.data.log.length;
  document.getElementById('recordCount').textContent =
    `${state.data.casos.length + state.data.log.length} processos carregados (${state.data.casos.length} ativos, ${state.data.log.length} no histórico)`;
  renderTable();
}

function visibleColumnsOrdered() {
  return COLUMNS.filter(c => state.visibleColumns.has(c.key));
}

function renderTable() {
  const rows = getFilteredSortedRows();
  const cols = visibleColumnsOrdered();

  // header
  const headRow = document.getElementById('tableHeadRow');
  headRow.innerHTML = cols.map(c => {
    let arrow = '';
    if (state.sort.key === c.key) arrow = `<span class="sort-arrow">${state.sort.dir === 1 ? '▲' : '▼'}</span>`;
    return `<th data-key="${c.key}">${escapeHtml(c.label)}${arrow}</th>`;
  }).join('');
  headRow.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (state.sort.key === key) state.sort.dir *= -1;
      else { state.sort.key = key; state.sort.dir = 1; }
      renderTable();
    });
  });

  // pagination slice
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const body = document.getElementById('tableBody');
  const emptyState = document.getElementById('emptyState');

  if (pageRows.length === 0) {
    body.innerHTML = '';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    body.innerHTML = pageRows.map(row => renderRow(row, cols)).join('');
    attachRowHandlers(body, rows);
  }

  renderPagination(totalPages, rows.length);
}

function renderRow(row, cols) {
  const cells = cols.map(c => {
    const val = row[c.key];
    let inner;
    if (c.key === 'status') {
      inner = badgeHtml(val);
    } else if (c.type === 'currency') {
      const f = fmtCurrency(val);
      inner = f ? `<span>${escapeHtml(f)}</span>` : `<span class="muted-cell">—</span>`;
    } else if (c.type === 'textarea') {
      inner = val ? escapeHtml(val) : `<span class="muted-cell">—</span>`;
    } else {
      inner = (val === null || val === undefined || val === '') ? `<span class="muted-cell">—</span>` : escapeHtml(val);
    }
    const editableAttr = c.editable ? `data-editable="1" data-key="${c.key}"` : '';
    const classes = ['cell-' + c.key];
    if (c.editable) classes.push('cell-editable');
    if (c.type === 'currency' || c.type === 'number') classes.push('num');
    return `<td class="${classes.join(' ')}" ${editableAttr}>${inner}</td>`;
  }).join('');
  return `<tr data-processo="${escapeHtml(row.processo || '')}" data-id="${escapeHtml(row.id)}">${cells}</tr>`;
}

function renderPagination(totalPages, totalRows) {
  const el = document.getElementById('pagination');
  if (totalRows === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <button id="pgPrev" ${state.page <= 1 ? 'disabled' : ''}>‹ Anterior</button>
    <span>Página ${state.page} de ${totalPages} — ${totalRows} processo(s)</span>
    <button id="pgNext" ${state.page >= totalPages ? 'disabled' : ''}>Próxima ›</button>
  `;
  const prev = document.getElementById('pgPrev');
  const next = document.getElementById('pgNext');
  if (prev) prev.addEventListener('click', () => { state.page--; renderTable(); });
  if (next) next.addEventListener('click', () => { state.page++; renderTable(); });
}

/* =========================================================
   INLINE EDITING
   ========================================================= */
function attachRowHandlers(tbody, currentRows) {
  tbody.querySelectorAll('td[data-editable="1"]').forEach(td => {
    td.addEventListener('click', function handler() {
      if (td.querySelector('input, select, textarea')) return; // already editing
      const tr = td.closest('tr');
      const processo = tr.dataset.processo;
      const row = currentRows.find(r => String(r.processo) === processo) ||
                  getActiveRows().find(r => String(r.processo) === processo);
      if (!row) return;
      const key = td.dataset.key;
      const col = COLUMNS.find(c => c.key === key);
      startEdit(td, row, col);
    });
  });
}

function startEdit(td, row, col) {
  const currentVal = row[col.key] || '';
  let input;

  if (col.type === 'status') {
    input = document.createElement('select');
    STATUS_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if (opt === currentVal) o.selected = true;
      input.appendChild(o);
    });
  } else if (col.type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 2;
    input.value = currentVal;
  } else if (col.type === 'date') {
    input = document.createElement('input');
    input.type = 'date';
    input.value = /^\d{4}-\d{2}-\d{2}$/.test(currentVal) ? currentVal : '';
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.value = currentVal;
  }

  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  if (input.select) input.select();

  const commit = async () => {
    const newVal = input.value;
    row[col.key] = newVal;
    await persistAll();
    renderTable();
    toast(`"${col.label}" atualizado em ${row.processo || '#' + row.id}`);
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && col.type !== 'textarea') { input.blur(); }
    if (e.key === 'Escape') { renderTable(); }
  });
}

/* =========================================================
   XLSX EXPORT
   ========================================================= */
function buildSheetAOA(rows) {
  const hl = state.headerLegend;
  const aoa = [hl.header, hl.legend];
  rows.forEach(r => {
    aoa.push(COLUMNS.map(c => {
      const v = r[c.key];
      return (v === undefined) ? null : v;
    }));
  });
  return aoa;
}

function exportXlsx() {
  const wb = XLSX.utils.book_new();

  const wsCasos = XLSX.utils.aoa_to_sheet(buildSheetAOA(state.data.casos));
  const wsLog = XLSX.utils.aoa_to_sheet(buildSheetAOA(state.data.log));

  XLSX.utils.book_append_sheet(wb, wsCasos, 'OP_Casos');
  XLSX.utils.book_append_sheet(wb, wsLog, 'OP_Log');

  const ts = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `OP_Casos_Export_${ts}.xlsx`);
  toast('Exportação concluída — todos os processos, ambas as abas.');
}

function exportFilteredXlsx() {
  // Exporta apenas os processos visíveis com os filtros/aba atuais.
  const wb = XLSX.utils.book_new();
  const rows = getFilteredSortedRows();
  const sheetName = state.activeTab === 'casos' ? 'OP_Casos' : 'OP_Log';
  const ws = XLSX.utils.aoa_to_sheet(buildSheetAOA(rows));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const ts = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `OP_Casos_Filtrado_${ts}.xlsx`);
  toast(`Exportação concluída — ${rows.length} processo(s) filtrado(s).`);
}

/* =========================================================
   XLSX IMPORT
   ========================================================= */
const IMPORT_PATTERN_COLS = COLUMNS.map(c => c.key);

async function handleFileImport(file) {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });

    const result = { casos: [], log: [] };
    let totalSkippedExample = 0;
    let duplicateWarnings = [];

    for (const sheetName of ['OP_Casos', 'OP_Log']) {
      if (!wb.Sheets[sheetName]) continue;
      const ws = wb.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

      if (aoa.length >= 1) state.headerLegend.header = aoa[0];
      if (aoa.length >= 2) state.headerLegend.legend = aoa[1];
      // aoa[2] = example row (yellow) -> always excluded
      if (aoa.length >= 3) totalSkippedExample++;

      const seenProcesso = new Set();
      const target = sheetName === 'OP_Casos' ? result.casos : result.log;

      for (let i = 3; i < aoa.length; i++) {
        const line = aoa[i];
        if (!line || line.every(v => v === null || v === '')) continue;
        const row = {};
        IMPORT_PATTERN_COLS.forEach((key, idx) => { row[key] = normalizeCell(line[idx]); });
        if (!row.processo && !row.id) continue;

        if (row.processo) {
          if (seenProcesso.has(row.processo)) {
            duplicateWarnings.push(`${sheetName}: processo duplicado "${row.processo}"`);
          }
          seenProcesso.add(row.processo);
        }
        target.push(row);
      }
    }

    if (result.casos.length === 0 && result.log.length === 0) {
      toast('Nenhum dado válido encontrado no arquivo (esperado abas OP_Casos / OP_Log).', true);
      return;
    }

    state.data.casos = result.casos;
    state.data.log = result.log;
    recalcAll(state.data.casos);
    recalcAll(state.data.log);
    await persistAll();

    buildFilterOptions();
    state.page = 1;
    renderAll();

    let msg = `Importado: ${result.casos.length} casos ativos, ${result.log.length} no histórico.`;
    if (duplicateWarnings.length) msg += ` Atenção: ${duplicateWarnings.length} processo(s) duplicado(s) detectado(s).`;
    toast(msg, duplicateWarnings.length > 0);
    if (duplicateWarnings.length) console.warn(duplicateWarnings.join('\n'));

  } catch (err) {
    console.error(err);
    toast('Erro ao importar arquivo: ' + err.message, true);
  }
}

function normalizeCell(v) {
  if (v === undefined) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  return v;
}

/* =========================================================
   RESET TO ORIGINAL SEED
   ========================================================= */
async function resetToSeed() {
  if (!confirm('Isso vai substituir todos os dados atuais pelos dados originais do arquivo OP_Casos_Base_v2.xlsx carregado nesta aplicação. Alterações feitas serão perdidas. Continuar?')) return;
  state.data.casos = JSON.parse(JSON.stringify(window.SEED_DATA.casos));
  state.data.log = JSON.parse(JSON.stringify(window.SEED_DATA.log));
  state.headerLegend = JSON.parse(JSON.stringify(window.HEADER_LEGEND));
  recalcAll(state.data.casos);
  recalcAll(state.data.log);
  await persistAll();
  buildFilterOptions();
  state.page = 1;
  renderAll();
  toast('Dados originais restaurados.');
}

/* =========================================================
   EVENT BINDING
   ========================================================= */
function bindEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      state.page = 1;
      renderTable();
    });
  });

  document.getElementById('searchInput').addEventListener('input', debounce((e) => {
    state.filters.search = e.target.value.trim();
    state.page = 1;
    renderTable();
  }, 200));

  document.getElementById('filterStatus').addEventListener('change', e => { state.filters.status = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterInstituicao').addEventListener('change', e => { state.filters.instituicao = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterComarca').addEventListener('change', e => { state.filters.comarca = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterAdvogado').addEventListener('change', e => { state.filters.advogado = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterEntradaFrom').addEventListener('change', e => { state.filters.entradaFrom = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterEntradaTo').addEventListener('change', e => { state.filters.entradaTo = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterPrazoFrom').addEventListener('change', e => { state.filters.prazoFrom = e.target.value; state.page = 1; renderTable(); });
  document.getElementById('filterPrazoTo').addEventListener('change', e => { state.filters.prazoTo = e.target.value; state.page = 1; renderTable(); });

  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    state.filters = { status: '', instituicao: '', comarca: '', advogado: '', search: '',
                      entradaFrom: '', entradaTo: '', prazoFrom: '', prazoTo: '' };
    document.getElementById('searchInput').value = '';
    ['filterStatus','filterInstituicao','filterComarca','filterAdvogado'].forEach(id => document.getElementById(id).value = '');
    ['filterEntradaFrom','filterEntradaTo','filterPrazoFrom','filterPrazoTo'].forEach(id => document.getElementById(id).value = '');
    state.page = 1;
    renderTable();
  });

  document.getElementById('columnsBtn').addEventListener('click', () => {
    const panel = document.getElementById('columnsPanel');
    panel.hidden = !panel.hidden;
  });
  document.getElementById('colsAllBtn').addEventListener('click', () => {
    state.visibleColumns = new Set(COLUMNS.map(c => c.key));
    buildColumnsPanel();
    renderTable();
  });
  document.getElementById('colsDefaultBtn').addEventListener('click', () => {
    state.visibleColumns = new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
    buildColumnsPanel();
    renderTable();
  });

  document.getElementById('exportBtn').addEventListener('click', exportXlsx);
  document.getElementById('exportFilteredBtn').addEventListener('click', exportFilteredXlsx);
  document.getElementById('resetBtn').addEventListener('click', resetToSeed);

  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileImport(file);
    e.target.value = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
})();
