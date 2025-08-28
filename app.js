/*************************************************************
 * DAO Gouvernance SubversArts – App.js (UI moderne)
 * - Connexion Keplr
 * - Viewing Keys (SNIP-721)
 * - Config externe via JSON (GitHub Pages)
 * - Propositions & Votes (Oui/Non/Abstention/Non avec Véto)
 * - Règles: quorum, seuil, véto, période 14j
 * - Onglets: Actives / Historique
 * - Admin: owner + base membres (quorum)
 *************************************************************/

/******************** Utils ********************/
const LS = {
  proposals: "dao_proposals_v1",
  admin: "dao_admin_v1",
  vks: "dao_viewing_keys_v1",
};

function byId(id){ return document.getElementById(id); }
function now(){ return Date.now(); }
function days(n){ return n*24*60*60*1000; }
function fmtPct(x){ return (x*100).toFixed(1)+"%"; }
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

/******************** Variables globales ********************/
let CONFIG = {
  owner: "",
  minNftRequired: 1,
  votingPeriodDays: 14,
  quorum: 0.40,      // 40% (fraction)
  passPct: 0.50,     // 50%
  vetoPct: 0.334     // 33.4%
};
let COLLECTIONS = [];   // [{contract, name, permissive, allowedTokenIds:["1","42"]}, ...]
let MEMBERS = [];       // ["secret1...", ...] (optionnel)
let PROPOSALS = [];     // propositions stockées localement
let USER = { address: null, viewingKeys: {}, isPermissive: false, banned: false };
let admin = { owner: "", membersBase: 0 };

/******************** Chargement des configs (GitHub Pages) ********************/
async function loadConfigs(){
  try{
    const [govRes, colRes, memRes] = await Promise.all([
      fetch("config/governance.json"),
      fetch("config/collections.json"),
      fetch("config/members.json")
    ]);
    const gov = await govRes.json();
    const col = await colRes.json();
    const mem = await memRes.json();

    CONFIG = { ...CONFIG, ...gov };
    COLLECTIONS = Array.isArray(col.collections) ? col.collections : [];
    MEMBERS = Array.isArray(mem.members) ? mem.members : [];

    const savedAdmin = JSON.parse(localStorage.getItem(LS.admin)||"null");
    admin.owner = savedAdmin?.owner || CONFIG.owner || "";
    admin.membersBase = Number(savedAdmin?.membersBase ?? CONFIG.membersBase ?? 0) || 0;

    // Viewing keys persistées
    try{ USER.viewingKeys = JSON.parse(localStorage.getItem(LS.vks)||"{}"); }catch{ USER.viewingKeys = {}; }

    console.log("✅ Config DAO:", CONFIG);
    console.log("✅ Collections:", COLLECTIONS);
    console.log("✅ Members (opt):", MEMBERS.length);
  }catch(e){
    console.error("❌ Erreur chargement config:", e);
    alert("Impossible de charger la configuration (config/*.json)");
  }
}

/******************** Keplr ********************/
async function connectKeplr(){
  if(!window.keplr){ alert("Installez Keplr (Chrome/Brave) puis rechargez la page."); return; }
  const chainId = "secret-4";
  try{
    await window.keplr.enable(chainId);
    const offlineSigner = window.getOfflineSigner(chainId);
    const [acc] = await offlineSigner.getAccounts();
    USER.address = acc.address;
    byId("userAddress").textContent = `Connecté : ${USER.address}`;
    await checkPermissiveRights();
    renderGate();
  }catch(err){
    console.error("Keplr connection error:", err);
    alert("Erreur de connexion Keplr");
  }
}

// Création d’une viewing key (flux simplifié via Keplr UI)
async function createViewingKeyFlow(){
  if(!USER.address){ return alert("Connectez d'abord Keplr."); }
  if(!COLLECTIONS.length){ return alert("Aucune collection configurée."); }

  // Choix via prompt simple
  const names = COLLECTIONS.map((c,i)=>`${i+1}. ${c.name} (${c.contract.slice(0,10)}…)`).join("\n");
  const idxStr = prompt("Créer une viewing key pour quelle collection ?\n"+names+"\nEntrez le numéro:");
  const idx = Math.max(1, Math.min(COLLECTIONS.length, parseInt(idxStr||"1",10))) - 1;
  const col = COLLECTIONS[idx];

  try{
    // Keplr n'a pas d'API VK générique SNIP-721 ; on laisse l'utilisateur ajouter le token pour initier le VK via l'UI du wallet/extensions compatibles.
    await window.keplr.suggestToken("secret-4", col.contract);
    // On stocke juste un flag (l'appli dApp réelle devrait ensuite appeler le contrat SNIP-721 avec la VK)
    USER.viewingKeys[col.contract] = "vk_set_via_keplr_ui";
    localStorage.setItem(LS.vks, JSON.stringify(USER.viewingKeys));
    alert(`Viewing Key enregistrée pour ${col.name}`);
    await checkPermissiveRights();
    renderGate();
  }catch(err){
    console.error("VK error:", err);
    alert("Échec création/enregistrement de la viewing key.");
  }
}

/******************** Vérification NFT permissifs ********************/
async function checkPermissiveRights(){
  // ⚠️ Place-holder: sans interroger réellement SNIP-721, on détecte juste si au moins une VK existe
  // Pour production: appeler le contrat (query tokens par owner + VK) et comparer allowedTokenIds
  const hasAnyVK = COLLECTIONS.some(c => USER.viewingKeys[c.contract]);
  USER.isPermissive = !!hasAnyVK && !USER.banned;
}

function renderGate(){
  const gate = byId("governanceSection");
  gate.classList.toggle("hidden", !(USER.isPermissive && !USER.banned));
}

/******************** Propositions & Votes ********************/
function loadProposals(){
  try{ PROPOSALS = JSON.parse(localStorage.getItem(LS.proposals)||"[]"); }catch{ PROPOSALS = []; }
}
function saveProposals(){ localStorage.setItem(LS.proposals, JSON.stringify(PROPOSALS)); }

function submitProposal(title, summary, amount){
  if(!USER.isPermissive || USER.banned) return alert("Droits insuffisants pour soumettre.");
  title = (title||"").trim(); summary=(summary||"").trim(); amount=(amount||"").trim();
  if(!title || !summary || !amount) return alert("Complétez Titre/Résumé/Montant.");

  const prop = {
    id: now(),
    title, summary, amount,
    proposer: USER.address,
    createdAt: now(),
    deadline: now() + days(CONFIG.votingPeriodDays||14),
    votes: {}, // addr -> "yes"|"no"|"abstain"|"veto"
    status: "active" // active|closed
  };
  PROPOSALS.push(prop);
  saveProposals();
  renderAll();
}

function vote(proposalId, choice){
  const p = PROPOSALS.find(x=>x.id===proposalId);
  if(!p) return;
  if(!USER.isPermissive || USER.banned) return alert("Droits insuffisants pour voter.");
  if(now() > p.deadline) return alert("Vote clos.");
  if(!["yes","no","abstain","veto"].includes(choice)) return;
  p.votes[USER.address] = choice; // vote remplaçable jusqu'à l'échéance
  saveProposals();
  renderAll();
}

/******************** Calculs de résultat ********************/
function computeTally(p){
  const votes = Object.values(p.votes);
  const total = votes.length;
  const yes = votes.filter(v=>v==="yes").length;
  const no = votes.filter(v=>v==="no").length;
  const abstain = votes.filter(v=>v==="abstain").length;
  const veto = votes.filter(v=>v==="veto").length;

  // Base quorum: admin.membersBase > MEMBERS.length > total votant au final (fallback)
  const base = Math.max( admin.membersBase || 0, MEMBERS.length || 0, 0 );
  const quorumReached = base ? (total/base) >= CONFIG.quorum : total > 0; // si pas de base connue, on considère tout vote valide
  const yesPct = total ? yes/total : 0;
  const vetoPct = total ? veto/total : 0;

  let outcome = "pending"; // adopted|rejected|rejected_veto|no_quorum|pending
  if(now() <= p.deadline){
    outcome = "pending";
  }else{
    if(!quorumReached) outcome = "no_quorum";
    else if(vetoPct >= CONFIG.vetoPct) outcome = "rejected_veto";
    else if(yesPct > CONFIG.passPct) outcome = "adopted";
    else outcome = "rejected";
  }

  return { total, yes, no, abstain, veto, base, quorumReached, yesPct, vetoPct, outcome };
}

function badgeClass(r){
  if(!r) return "";
  if(r.outcome === "pending") return "badge-warn";
  if(r.outcome === "no_quorum") return "badge-warn";
  if(r.outcome === "rejected_veto") return "badge-danger";
  if(r.outcome === "adopted") return "badge-pass";
  return "badge-fail"; // rejected
}
function badgeText(r){
  if(!r) return "";
  switch(r.outcome){
    case "pending": return "En cours";
    case "no_quorum": return "Échec (pas de quorum)";
    case "rejected_veto": return "Rejeté (véto)";
    case "adopted": return "Adoptée";
    case "rejected": return "Rejetée";
    default: return "";
  }
}

/******************** Rendu UI ********************/
function renderAll(){
  renderGate();
  renderProposals();
  refreshAdminUI();
}

function renderProposals(){
  const activeBox = byId("propsActive");
  const histBox = byId("propsHistory");
  activeBox.innerHTML = ""; histBox.innerHTML = "";

  const nowTs = now();
  const active = PROPOSALS.filter(p=> nowTs <= p.deadline);
  const history = PROPOSALS.filter(p=> nowTs > p.deadline);

  for(const p of active){ activeBox.appendChild(renderProposalCard(p)); }
  for(const p of history){ histBox.appendChild(renderProposalCard(p)); }
}

function renderProposalCard(p){
  const r = computeTally(p);

  const card = document.createElement("div");
  card.className = "proposal";

  const rows = [
    ["Oui", r.yes],["Non", r.no],["Abstention", r.abstain],["Non avec véto", r.veto],
    ["Participants", r.total],["Base quorum", r.base||"—"],["Quorum atteint", r.quorumReached?"Oui":"Non"],
    ["% Oui (participants)", fmtPct(r.yesPct)],["% Véto (participants)", fmtPct(r.vetoPct)],
  ];
  const parts = rows.map(([k,v])=>`<div class="row"><div class="col label">${k}</div><div class="col">${v}</div></div>`).join("");

  const actions = (now() <= p.deadline && USER.isPermissive && !USER.banned) ? `
    <div class="actions">
      <button class="b-yes" onclick="vote(${p.id}, 'yes')">Oui</button>
      <button class="b-no" onclick="vote(${p.id}, 'no')">Non</button>
      <button class="b-abstain" onclick="vote(${p.id}, 'abstain')">S'abstenir</button>
      <button class="b-veto" onclick="vote(${p.id}, 'veto')">Non avec Véto</button>
    </div>` : "";

  card.innerHTML = `
    <div class="card-head">
      <h3>${escapeHtml(p.title)} <span class="badge ${badgeClass(r)}">${badgeText(r)}</span></h3>
      <div class="meta">Par ${escapeHtml(p.proposer)} • Fin: ${new Date(p.deadline).toLocaleString()}</div>
    </div>
    <p class="desc"><b>Résumé :</b> ${escapeHtml(p.summary)}</p>
    <p class="amt"><b>Montant :</b> ${escapeHtml(p.amount)}</p>
    <div class="mt8 muted">${parts}</div>
    ${actions}
  `;
  return card;
}

/******************** Onglets & Admin ********************/
function setupTabs(){
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t=> t.onclick = () => {
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.getAttribute('data-tab');
    byId('propsActive').classList.toggle('hidden', tab!=="active");
    byId('propsHistory').classList.toggle('hidden', tab!=="history");
  });
}

function refreshAdminUI(){
  byId('membersBase').value = admin.membersBase||0;
  byId('ownerAddr').value = admin.owner||"";
  // afficher admin si owner
  const isOwner = (USER.address && USER.address === admin.owner);
  byId('adminSection').classList.toggle('hidden', !isOwner);
}

function saveAdmin(){
  admin.membersBase = parseInt(byId('membersBase').value||"0",10) || 0;
  admin.owner = (byId('ownerAddr').value||"").trim();
  localStorage.setItem(LS.admin, JSON.stringify(admin));
  alert("Paramètres admin enregistrés.");
  refreshAdminUI();
}

/******************** Export ********************/
function exportJSON(){
  const blob = new Blob([JSON.stringify({ proposals: PROPOSALS, members: MEMBERS, admin }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="subversarts_gov_export.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/******************** Init ********************/
window.addEventListener("load", async () => {
  await loadConfigs();
  loadProposals();
  renderAll();

  // Bind UI
  byId("btnConnect").onclick = connectKeplr;
  const btnCreateVK = byId("btnCreateVK");
  if(btnCreateVK) btnCreateVK.onclick = createViewingKeyFlow;

  byId("btnSubmitProposal").onclick = () => {
    const title = byId("title").value;
    const summary = byId("summary").value;
    const amount = byId("amount").value;
    submitProposal(title, summary, amount);
    byId("title").value = ""; byId("summary").value = ""; byId("amount").value = "";
  };

  setupTabs();
  refreshAdminUI();
});
