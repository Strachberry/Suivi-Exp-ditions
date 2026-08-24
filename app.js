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
    <div class="meta">📍 ${escapeHtml(s.pays || "Destination non précisée")} · ${escapeHtml(s.transitaire || "Transitaire non précisé")}</div>

    <div class="boat-head">
      <div class="status-label" style="color:${sc.text}">${status}</div>
      <div class="phase-text">${escapeHtml(currentPhaseText(s))}</div>
    </div>
    <div class="lane">
      <div class="dash"></div>
      <div class="port" style="left:8px;">⚓</div>
      <div class="port" style="right:8px;">🏁</div>
      <div class="boat" style="left:${left}%;">🚢</div>
    </div>

    <div class="stepper">
      <div class="stepper-label">📦 Côté client</div>
      ${stepsRowHtml(s.id, state.steps.client, s.clientStepValue, "client", "#2C5F8A")}
      <div class="stepper-current">${s.clientStepValue ? escapeHtml(s.clientStepValue) : "Pas encore commencé"}</div>
    </div>
    <div class="stepper">
      <div class="stepper-label">🚚 Côté transitaire</div>
      ${stepsRowHtml(s.id, state.steps.transit, s.transitStepValue, "transit", "#8A6A3B")}
      <div class="stepper-current">${s.transitStepValue ? escapeHtml(s.transitStepValue) : "Pas encore commencé"}</div>
    </div>

    <div class="card-footer">
      ${s.lien ? `<a class="moovapps-link" href="${escapeHtml(s.lien)}" target="_blank" rel="noopener noreferrer">🔗 Dossier Moovapps</a>` : `<span class="no-link">Pas de lien Moovapps</span>`}
      <button class="delete-btn" title="Supprimer" onclick="deleteShipment('${s.id}')">🗑</button>
    </div>
  </div>`;
}

function render() {
  const toolbar = document.getElementById("toolbar");
  const filters = ["TOUS", "NOUVEAU", "EN TRANSIT", "LIVRÉ"];
  toolbar.innerHTML = filters.map((f) =>
    `<button class="chip ${state.filter === f ? "active" : ""}" onclick="setFilter('${f}')">${f}</button>`
  ).join("") + (state.clientFilter
    ? `<button class="chip client-active" onclick="clearClientFilter()">Client : ${escapeHtml(state.clientFilter)} ✕</button>`
    : "");

  const filtered = state.shipments.filter((s) =>
    (state.filter === "TOUS" || overallStatus(s) === state.filter) &&
    (!state.clientFilter || s.client === state.clientFilter)
  );

  const content = document.getElementById("content");
  if (filtered.length === 0) {
    content.innerHTML = `<div class="empty">✅<div>Aucun envoi ici</div>
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
      <div class="modal-head"><h2>Nouvel envoi</h2><button class="close-btn" onclick="closeModal()">✕</button></div>
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
      <div class="modal-head"><h2>Étapes de suivi</h2><button class="close-btn" onclick="closeModal()">✕</button></div>
      <div class="modal-note">Ajoute, renomme, réordonne ou supprime les étapes. L'ordre détermine la progression du bateau.</div>
      <div class="settings-columns">
        <div class="settings-col">
          <h3>📦 Étapes côté client</h3>
          <div id="settings-client"></div>
          <button class="add-step-btn" onclick="addDraftStep('client')">+ Ajouter une étape</button>
        </div>
        <div class="settings-col">
          <h3>🚚 Étapes côté transitaire</h3>
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
      <button class="icon-btn" onclick="moveDraftStep('${type}',${i},-1)" ${i === 0 ? "disabled" : ""}>↑</button>
      <button class="icon-btn" onclick="moveDraftStep('${type}',${i},1)" ${i === draftSteps[type].length - 1 ? "disabled" : ""}>↓</button>
      <input value="${escapeHtml(step)}" oninput="updateDraftStep('${type}',${i},this.value)" />
      <button class="icon-btn" onclick="removeDraftStep('${type}',${i})">✕</button>
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
      <div class="modal-head"><h2>Importer un CSV</h2><button class="close-btn" onclick="closeModal()">✕</button></div>
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
  if (warnings.length) html += `<div class="warning-box">${warnings.map((w) => `⚠️ ${escapeHtml(w)}`).join("<br>")}</div>`;
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
