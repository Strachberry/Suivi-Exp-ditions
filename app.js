// ===== Registre des expéditions — SOKA =====
// Aucune dépendance externe. Toutes les données restent dans ce navigateur
// (localStorage) sauf export/import volontaire en CSV.

const DEFAULT_CLIENT_STEPS = ["Commande reçue", "Documents transmis", "Expédié", "Dédouané", "Livré"];
const DEFAULT_TRANSIT_STEPS = ["Pris en charge", "En transport", "En dédouanement", "Livraison finale", "Confirmé"];

const SHIPMENTS_KEY = "soka-shipments-v1";
const STEPS_KEY = "soka-steps-v1";
const CSV_HEADERS = ["Référence", "Client", "Transitaire", "Pays destination", "Date création", "Lien Moovapps", "Étape client", "Étape transitaire"];

let state = {
  shipments: [],
  steps: { client: [...DEFAULT_CLIENT_STEPS], transit: [...DEFAULT_TRANSIT_STEPS] },
  filter: "TOUS",
  clientFilter: null,
};

let draftSteps = null; // édition en cours dans la fenêtre Réglages

// ---------- Icônes SVG inline (aucune dépendance externe) ----------
const ICON_PATHS = {
  package: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  mapPin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  externalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  ship: '<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  anchor: '<circle cx="12" cy="5" r="3"/><line x1="12" x2="12" y1="22" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 3.6-1.2A1 1 0 0 1 21 3.4v10.8a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  alertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
};

function icon(name, size = 16, extraStyle = "") {
  const paths = ICON_PATHS[name] || "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0;${extraStyle}">${paths}</svg>`;
}

function uid() {
  return "exp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// ---------- Persistance ----------
function loadState() {
  try {
    const rawShipments = localStorage.getItem(SHIPMENTS_KEY);
    state.shipments = rawShipments ? JSON.parse(rawShipments) : [];
  } catch (e) { state.shipments = []; }

  try {
    const rawSteps = localStorage.getItem(STEPS_KEY);
    if (rawSteps) {
      const parsed = JSON.parse(rawSteps);
      if (Array.isArray(parsed.client) && parsed.client.length) state.steps.client = parsed.client;
      if (Array.isArray(parsed.transit) && parsed.transit.length) state.steps.transit = parsed.transit;
    }
  } catch (e) { /* garde les valeurs par défaut */ }
}

function saveShipments() {
  try { localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(state.shipments)); }
  catch (e) { alert("La sauvegarde locale a échoué (stockage plein ou navigation privée)."); }
}

function saveSteps() {
  try { localStorage.setItem(STEPS_KEY, JSON.stringify(state.steps)); }
  catch (e) { alert("La sauvegarde locale des étapes a échoué."); }
}

// ---------- Logique métier ----------
function overallStatus(s) {
  const c = state.steps.client.indexOf(s.clientStepValue || "");
  const t = state.steps.transit.indexOf(s.transitStepValue || "");
  const cDone = c === state.steps.client.length - 1;
  const tDone = t === state.steps.transit.length - 1;
  if (cDone && tDone) return "LIVRÉ";
  if (c === -1 && t === -1) return "NOUVEAU";
  return "EN TRANSIT";
}

function stampColor(status) {
  if (status === "LIVRÉ") return { text: "#5A6E42" };
  if (status === "NOUVEAU") return { text: "#8A7F63" };
  return { text: "#2C5F8A" };
}

function progressFraction(s) {
  const c = state.steps.client.indexOf(s.clientStepValue || "");
  const t = state.steps.transit.indexOf(s.transitStepValue || "");
  const total = state.steps.client.length + state.steps.transit.length;
  const done = (c + 1) + (t + 1);
  return total === 0 ? 0 : done / total;
}

function currentPhaseText(s) {
  const parts = [];
  if (s.clientStepValue) parts.push(s.clientStepValue);
  if (s.transitStepValue) parts.push(s.transitStepValue);
  return parts.length ? parts.join(" · ") : "En attente de départ";
}

// ---------- Rendu ----------
function stepsRowHtml(shipmentId, steps, currentValue, type, color) {
  const currentIndex = steps.indexOf(currentValue || "");
  let html = '<div class="steps-row">';
  steps.forEach((step, i) => {
    const reached = i <= currentIndex;
    const isCurrent = i === currentIndex;
    const targetIndex = isCurrent ? i - 1 : i;
    const targetValue = targetIndex >= 0 ? steps[targetIndex] : "";
    html += `<button class="step-dot ${isCurrent ? "current" : ""}" title="${escapeHtml(step)}"
      style="border-color:${reached ? color : "var(--line)"}; background:${reached ? color : "var(--paper)"};"
      onclick="setStep('${shipmentId}','${type}', ${JSON.stringify(targetValue)})"></button>`;
    if (i < steps.length - 1) {
      html += `<div class="step-connector" style="background:${i < currentIndex ? color : "var(--line)"};"></div>`;
    }
  });
  html += "</div>";
  return html;
}

function cardHtml(s) {
  const status = overallStatus(s);
  const sc = stampColor(status);
  const frac = progressFraction(s);
  const left = 8 + frac * 84;

  return `
  <div class="card">
    <div class="ref">${escapeHtml(s.ref || s.id.toUpperCase())}</div>
    <button class="client-link" onclick="filterByClient(${JSON.stringify(s.client || "")})">${escapeHtml(s.client || "Client sans nom")}</button>
    <div class="meta">${icon("mapPin", 12)} ${escapeHtml(s.pays || "Destination non précisée")} · ${escapeHtml(s.transitaire || "Transitaire non précisé")}</div>

    <div class="boat-head">
      <div class="status-label" style="color:${sc.text}">${status}</div>
      <div class="phase-text">${escapeHtml(currentPhaseText(s))}</div>
    </div>
    <div class="lane">
      <div class="dash"></div>
      <div class="port" style="left:8px;">${icon("anchor", 14)}</div>
      <div class="port" style="right:8px;">${icon("flag", 14)}</div>
      <div class="boat" style="left:${left}%; color:${sc.text};">${icon("ship", 24)}</div>
    </div>

    <div class="stepper">
      <div class="stepper-label">${icon("package", 13)} Côté client</div>
      ${stepsRowHtml(s.id, state.steps.client, s.clientStepValue, "client", "#2C5F8A")}
      <div class="stepper-current">${s.clientStepValue ? escapeHtml(s.clientStepValue) : "Pas encore commencé"}</div>
    </div>
    <div class="stepper">
      <div class="stepper-label">${icon("truck", 13)} Côté transitaire</div>
      ${stepsRowHtml(s.id, state.steps.transit, s.transitStepValue, "transit", "#8A6A3B")}
      <div class="stepper-current">${s.transitStepValue ? escapeHtml(s.transitStepValue) : "Pas encore commencé"}</div>
    </div>

    <div class="card-footer">
      ${s.lien ? `<a class="moovapps-link" href="${escapeHtml(s.lien)}" target="_blank" rel="noopener noreferrer">${icon("externalLink", 13)} Dossier Moovapps</a>` : `<span class="no-link">Pas de lien Moovapps</span>`}
      <button class="delete-btn" title="Supprimer" onclick="deleteShipment('${s.id}')">${icon("trash", 14)}</button>
    </div>
  </div>`;
}

function render() {
  const toolbar = document.getElementById("toolbar");
  const filters = ["TOUS", "NOUVEAU", "EN TRANSIT", "LIVRÉ"];
  toolbar.innerHTML = filters.map((f) =>
    `<button class="chip ${state.filter === f ? "active" : ""}" onclick="setFilter('${f}')">${f}</button>`
  ).join("") + (state.clientFilter
    ? `<button class="chip client-active" onclick="clearClientFilter()">Client : ${escapeHtml(state.clientFilter)} ${icon("x", 12)}</button>`
    : "");

  const filtered = state.shipments.filter((s) =>
    (state.filter === "TOUS" || overallStatus(s) === state.filter) &&
    (!state.clientFilter || s.client === state.clientFilter)
  );

  const content = document.getElementById("content");
  if (filtered.length === 0) {
    content.innerHTML = `<div class="empty">${icon("checkCircle", 28, "opacity:0.5;margin-bottom:10px;")}<div>Aucun envoi ici</div>
      <div class="sub">Clique sur « Nouvel envoi » ou « Importer un CSV » pour commencer.</div></div>`;
  } else {
    content.innerHTML = `<div class="grid">${filtered.map(cardHtml).join("")}</div>`;
  }
}

function setFilter(f) { state.filter = f; render(); }
function filterByClient(c) { if (c) { state.clientFilter = c; render(); } }
function clearClientFilter() { state.clientFilter = null; render(); }

function setStep(id, type, value) {
  const s = state.shipments.find((x) => x.id === id);
  if (!s) return;
  if (type === "client") s.clientStepValue = value;
  else s.transitStepValue = value;
  saveShipments();
  render();
}

function deleteShipment(id) {
  state.shipments = state.shipments.filter((s) => s.id !== id);
  saveShipments();
  render();
}

// ---------- Modales ----------
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

function openNew() {
  document.getElementById("modal-root").innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal">
      <div class="modal-head"><h2>Nouvel envoi</h2><button class="close-btn" onclick="closeModal()">${icon("x", 18)}</button></div>
      <div class="field"><label>Client</label><input id="f-client" /></div>
      <div class="field"><label>Transitaire</label><input id="f-transitaire" /></div>
      <div class="field"><label>Pays de destination</label><input id="f-pays" /></div>
      <div class="field"><label>Référence envoi</label><input id="f-ref" /></div>
      <div class="field"><label>Lien dossier Moovapps</label><input id="f-lien" /></div>
      <button class="modal-submit" onclick="submitNew()">Ajouter l'envoi</button>
    </div>
  </div>`;
}

function submitNew() {
  const client = document.getElementById("f-client").value.trim();
  if (!client) return;
  const s = {
    id: uid(),
    client,
    transitaire: document.getElementById("f-transitaire").value.trim(),
    pays: document.getElementById("f-pays").value.trim(),
    ref: document.getElementById("f-ref").value.trim(),
    lien: document.getElementById("f-lien").value.trim(),
    date: "",
    clientStepValue: "",
    transitStepValue: "",
    createdAt: Date.now(),
  };
  state.shipments = [s, ...state.shipments];
  saveShipments();
  closeModal();
  render();
}

// ---------- Réglages : étapes éditables ----------
function openSettings() {
  draftSteps = { client: [...state.steps.client], transit: [...state.steps.transit] };
  renderSettingsModal();
}

function renderSettingsModal() {
  document.getElementById("modal-root").innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal wide">
      <div class="modal-head"><h2>Étapes de suivi</h2><button class="close-btn" onclick="closeModal()">${icon("x", 18)}</button></div>
      <div class="modal-note">Ajoute, renomme, réordonne ou supprime les étapes. L'ordre détermine la progression du bateau.</div>
      <div class="settings-columns">
        <div class="settings-col">
          <h3>${icon("package", 13, "margin-right:4px;")}Étapes côté client</h3>
          <div id="settings-client"></div>
          <button class="add-step-btn" onclick="addDraftStep('client')">+ Ajouter une étape</button>
        </div>
        <div class="settings-col">
          <h3>${icon("truck", 13, "margin-right:4px;")}Étapes côté transitaire</h3>
          <div id="settings-transit"></div>
          <button class="add-step-btn" onclick="addDraftStep('transit')">+ Ajouter une étape</button>
        </div>
      </div>
      <button class="modal-submit" style="background:var(--blue); color:var(--paper); margin-top:16px;" onclick="saveSettings()">Enregistrer les étapes</button>
    </div>
  </div>`;
  renderStepEditColumn("client");
  renderStepEditColumn("transit");
}

function renderStepEditColumn(type) {
  const container = document.getElementById(`settings-${type}`);
  container.innerHTML = draftSteps[type].map((step, i) => `
    <div class="step-edit-row">
      <button class="icon-btn" onclick="moveDraftStep('${type}',${i},-1)" ${i === 0 ? "disabled" : ""}>${icon("chevronUp", 12)}</button>
      <button class="icon-btn" onclick="moveDraftStep('${type}',${i},1)" ${i === draftSteps[type].length - 1 ? "disabled" : ""}>${icon("chevronDown", 12)}</button>
      <input value="${escapeHtml(step)}" oninput="updateDraftStep('${type}',${i},this.value)" />
      <button class="icon-btn" onclick="removeDraftStep('${type}',${i})">${icon("x", 12)}</button>
    </div>
  `).join("");
}

function updateDraftStep(type, i, value) { draftSteps[type][i] = value; }
function addDraftStep(type) { draftSteps[type].push("Nouvelle étape"); renderStepEditColumn(type); }
function removeDraftStep(type, i) {
  if (draftSteps[type].length <= 1) { alert("Il faut garder au moins une étape."); return; }
  draftSteps[type].splice(i, 1);
  renderStepEditColumn(type);
}
function moveDraftStep(type, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= draftSteps[type].length) return;
  [draftSteps[type][i], draftSteps[type][j]] = [draftSteps[type][j], draftSteps[type][i]];
  renderStepEditColumn(type);
}

function saveSettings() {
  const clean = (arr) => arr.map((s) => s.trim()).filter((s) => s.length > 0);
  const client = clean(draftSteps.client);
  const transit = clean(draftSteps.transit);
  if (client.length === 0 || transit.length === 0) { alert("Chaque liste doit contenir au moins une étape."); return; }
  state.steps.client = client;
  state.steps.transit = transit;
  saveSteps();
  closeModal();
  render();
}

// ---------- CSV : parsing générique (virgule ou tabulation) ----------
function splitDelimitedLine(line, delim) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delim) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseDelimitedText(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const delim = lines[0].split("\t").length > lines[0].split(",").length ? "\t" : ",";
  return lines.map((l) => splitDelimitedLine(l, delim));
}

function mergeParsedRows(rows) {
  const norm = (s) => (s || "").trim().toLowerCase();
  let headerMap = null;
  let startIdx = 0;
  if (rows.length && norm(rows[0][0]) === "référence") {
    headerMap = rows[0].map(norm);
    startIdx = 1;
  }
  const getCell = (row, name, fallbackIdx) => {
    if (headerMap) { const idx = headerMap.indexOf(name); return idx >= 0 ? (row[idx] || "") : ""; }
    return row[fallbackIdx] || "";
  };

  const warnings = [];
  let added = 0, updated = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    const ref = getCell(row, "référence", 0).trim();
    const client = getCell(row, "client", 1).trim();
    if (!ref && !client) continue;

    const transitaire = getCell(row, "transitaire", 2).trim();
    const pays = getCell(row, "pays destination", 3).trim();
    const date = getCell(row, "date création", 4).trim();
    const lien = getCell(row, "lien moovapps", 5).trim();
    const clientStepText = getCell(row, "étape client", 6).trim();
    const transitStepText = getCell(row, "étape transitaire", 7).trim();

    let clientStepValue = "";
    if (clientStepText) {
      if (state.steps.client.includes(clientStepText)) clientStepValue = clientStepText;
      else warnings.push(`Ligne ${i + 1} : étape client « ${clientStepText} » inconnue, ignorée.`);
    }
    let transitStepValue = "";
    if (transitStepText) {
      if (state.steps.transit.includes(transitStepText)) transitStepValue = transitStepText;
      else warnings.push(`Ligne ${i + 1} : étape transitaire « ${transitStepText} » inconnue, ignorée.`);
    }

    const existing = ref ? state.shipments.find((s) => norm(s.ref) === norm(ref)) : null;
    if (existing) {
      Object.assign(existing, { client, transitaire, pays, date, lien, clientStepValue, transitStepValue });
      updated++;
    } else {
      state.shipments.push({
        id: uid(), ref, client, transitaire, pays, date, lien, clientStepValue, transitStepValue, createdAt: Date.now(),
      });
      added++;
    }
  }
  return { added, updated, warnings };
}

function openImport() {
  document.getElementById("modal-root").innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal wide">
      <div class="modal-head"><h2>Importer un CSV</h2><button class="close-btn" onclick="closeModal()">${icon("x", 18)}</button></div>
      <div class="modal-note">
        Choisis un fichier .csv exporté depuis cette appli ou ton classeur, ou colle directement des lignes copiées depuis Excel.<br>
        Colonnes attendues : ${CSV_HEADERS.join(", ")}.
      </div>
      <div class="field">
        <label>Fichier CSV</label>
        <input type="file" id="csv-file-input" accept=".csv,.txt" onchange="handleCsvFile(event)" />
      </div>
      <div class="field"><label>...ou coller ici</label><textarea id="import-text" placeholder="Colle ici les lignes copiées depuis Excel…"></textarea></div>
      <div id="import-feedback"></div>
      <button class="modal-submit" style="background:var(--blue); color:var(--paper);" onclick="submitImport()">Importer</button>
    </div>
  </div>`;
}

function handleCsvFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { document.getElementById("import-text").value = e.target.result; };
  reader.readAsText(file, "UTF-8");
}

function submitImport() {
  const text = document.getElementById("import-text").value;
  const rows = parseDelimitedText(text);
  const { added, updated, warnings } = mergeParsedRows(rows);
  const feedback = document.getElementById("import-feedback");
  let html = "";
  if (warnings.length) html += `<div class="warning-box">${warnings.map((w) => `${icon("alertCircle", 13, "margin-right:4px;")}${escapeHtml(w)}`).join("<br>")}</div>`;
  html += `<div class="import-result">${added} envoi(s) ajouté(s), ${updated} mis à jour.</div>`;
  feedback.innerHTML = html;
  if (added || updated) { saveShipments(); render(); }
}

// ---------- CSV : export ----------
function csvEscape(value) {
  const v = (value == null) ? "" : String(value);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function exportCsv() {
  const rows = [CSV_HEADERS];
  state.shipments.forEach((s) => {
    rows.push([s.ref || "", s.client || "", s.transitaire || "", s.pays || "", s.date || "", s.lien || "", s.clientStepValue || "", s.transitStepValue || ""]);
  });
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `envois-soka-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Initialisation ----------
loadState();
render();
