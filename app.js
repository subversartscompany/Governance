/*************************************************************
 * DAO Gouvernance avec Keplr + NFT permissifs
 * Config externe via JSON (GitHub Pages)
 * Intégration UI quorum + admin
 *************************************************************/

// ==================== Variables globales ====================
let CONFIG = {};
let COLLECTIONS = [];
let MEMBERS = [];
let PROPOSALS = []; // propositions en mémoire
let USER = { address: null, viewingKeys: {}, isPermissive: false, banned: false };
let admin = { owner: "", membersBase: 0 };

// ==================== Chargement des configs ====================
async function loadConfigs() {
  try {
    const [govRes, colRes, memRes] = await Promise.all([
      fetch("config/governance.json"),
      fetch("config/collections.json"),
      fetch("config/members.json")
    ]);

    CONFIG = await govRes.json();
    COLLECTIONS = (await colRes.json()).collections;
    MEMBERS = (await memRes.json()).members;

    admin.owner = CONFIG.owner || "";
    admin.membersBase = CONFIG.membersBase || 0;

    console.log("✅ Config DAO :", CONFIG);
    console.log("✅ Collections permissives :", COLLECTIONS);
    console.log("✅ Membres initiaux :", MEMBERS);

  } catch (e) {
    console.error("❌ Erreur chargement config :", e);
    alert("Impossible de charger les fichiers de configuration.");
  }
}

// ==================== Connexion Keplr ====================
async function connectKeplr() {
  if (!window.keplr) {
    alert("Installez Keplr !");
    return;
  }

  await window.keplr.enable("secret-4");
  const offlineSigner = window.getOfflineSigner("secret-4");
  const accounts = await offlineSigner.getAccounts();

  USER.address = accounts[0].address;
  document.getElementById("userAddress").innerText = "Connecté : " + USER.address;

  console.log("Adresse connectée :", USER.address);

  await checkPermissiveRights();
}

// ==================== Viewing Keys ====================
async function createViewingKey(contractAddr) {
  if (!window.keplr) return alert("Keplr non détecté");
  const chainId = "secret-4";
  try {
    const res = await window.keplr.suggestToken(chainId, contractAddr);
    USER.viewingKeys[contractAddr] = res; // simplifié
    console.log("VK créée pour", contractAddr, ":", res);
    alert("Viewing key créée pour " + contractAddr);
  } catch (err) {
    console.error("Erreur VK :", err);
    alert("Erreur création VK");
  }
}

// ==================== Vérification NFT permissifs ====================
async function checkPermissiveRights() {
  USER.isPermissive = false;

  for (let col of COLLECTIONS) {
    const vk = USER.viewingKeys[col.contract];
    if (!vk) continue;

    // Simulation → ici tu dois interroger le contrat SNIP-721
    const hasNft = Math.random() > 0.5;

    if (hasNft) {
      USER.isPermissive = true;
      break;
    }
  }

  if (USER.isPermissive && !USER.banned) {
    document.getElementById("governanceSection").style.display = "block";
  } else {
    document.getElementById("governanceSection").style.display = "none";
  }
}

// ==================== Propositions ====================
function submitProposal(title, summary, amount) {
  if (!USER.isPermissive || USER.banned) {
    alert("Vous n’avez pas les droits pour soumettre une proposition.");
    return;
  }

  const deadline = Date.now() + CONFIG.votingPeriodDays * 24 * 60 * 60 * 1000;
  const prop = {
    id: Date.now(),
    title,
    summary,
    amount,
    proposer: USER.address,
    votes: {},
    deadline,
    status: "active"
  };

  PROPOSALS.push(prop);
  saveProposals();
  renderProposals();
}

function vote(proposalId, choice) {
  const prop = PROPOSALS.find(p => p.id === proposalId);
  if (!prop) return;

  if (!USER.isPermissive || USER.banned) {
    alert("Vous n’avez pas les droits de voter.");
    return;
  }

  prop.votes[USER.address] = choice;
  saveProposals();
  renderProposals();
}

// ==================== Sauvegarde ====================
function saveProposals() {
  localStorage.setItem("proposals", JSON.stringify(PROPOSALS));
}
function loadProposals() {
  PROPOSALS = JSON.parse(localStorage.getItem("proposals") || "[]");
}

// ==================== Rendu des propositions ====================
function renderProposals() {
  const container = document.getElementById("proposalsList");
  container.innerHTML = "";

  PROPOSALS.forEach(p => {
    const votes = Object.values(p.votes);
    const totalVotes = votes.length;
    const yes = votes.filter(v => v === "yes").length;
    const no = votes.filter(v => v === "no").length;
    const abstain = votes.filter(v => v === "abstain").length;
    const veto = votes.filter(v => v === "veto").length;

    // Stats gouvernance
    const r = {
      quorumReached: totalVotes >= CONFIG.quorum,
      yesPct: totalVotes ? yes / totalVotes : 0,
      vetoPct: totalVotes ? veto / totalVotes : 0,
    };

    const rows = [
      ["Oui", yes], ["Non", no], ["Abstention", abstain], ["Non avec véto", veto],
      ["Participants", totalVotes], ["Base quorum", CONFIG.quorum], ["Quorum atteint", r.quorumReached ? "Oui" : "Non"],
      ["% Oui (participants)", (r.yesPct * 100).toFixed(1) + "%"], ["% Véto (participants)", (r.vetoPct * 100).toFixed(1) + "%"],
    ];
    const parts = rows.map(([k, v]) => `<div class="row"><div class="col label">${k}</div><div class="col">${v}</div></div>`).join("");

    const statusBadge = `<span class="badge ${badgeClass(r)}">${badgeText(r)}</span>`;

    const div = document.createElement("div");
    div.className = "proposal";
    div.innerHTML = `
      <h3>${p.title} ${statusBadge}</h3>
      <p><b>Résumé :</b> ${p.summary}</p>
      <p><b>Montant :</b> ${p.amount}</p>
      <div class="mt8 muted">${parts}</div>
      <button onclick="vote(${p.id}, 'yes')">Oui</button>
      <button onclick="vote(${p.id}, 'no')">Non</button>
      <button onclick="vote(${p.id}, 'abstain')">S'abstenir</button>
      <button onclick="vote(${p.id}, 'veto')">Non avec Véto</button>
    `;

    container.appendChild(div);
  });
}

// ==================== Fonctions UI complémentaires ====================
function badgeClass(r) {
  if (!r) return "";
  if (!r.quorumReached) return "badge-warn";
  if (r.vetoPct >= CONFIG.vetoPct) return "badge-danger";
  if (r.yesPct > CONFIG.passPct) return "badge-pass";
  return "badge-fail";
}
function badgeText(r) {
  if (!r) return "";
  if (!r.quorumReached) return "Échec (pas de quorum)";
  if (r.vetoPct >= CONFIG.vetoPct) return "Rejeté (véto)";
  if (r.yesPct > CONFIG.passPct) return "Adoptée";
  return "Rejetée";
}

function exportJSON() {
  const blob = new Blob([JSON.stringify({ proposals: PROPOSALS, members: MEMBERS, admin }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "dao_export.json"; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.onclick = () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.getAttribute('data-tab');
    byId('propsActive').classList.toggle('hidden', tab !== "active");
    byId('propsHistory').classList.toggle('hidden', tab !== "history");
  });
}

function refreshAdminUI() {
  byId('membersBase').value = admin.membersBase || 0;
  byId('ownerAddr').value = admin.owner || "";
}

function saveAdmin() {
  admin.membersBase = parseInt(byId('membersBase').value || "0", 10) || 0;
  admin.owner = (byId('ownerAddr').value || "").trim();
  localStorage.setItem("admin", JSON.stringify(admin));
  alert("Paramètres admin enregistrés.");
  if (isOwner()) byId("adminSection").classList.remove("hidden");
}

function isOwner() {
  return USER.address === admin.owner;
}

function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }

// ==================== Init ====================
window.addEventListener("load", async () => {
  await loadConfigs();
  loadProposals();
  renderProposals();

  document.getElementById("btnConnect").onclick = connectKeplr;
  document.getElementById("btnSubmitProposal").onclick = () => {
    const title = document.getElementById("title").value;
    const summary = document.getElementById("summary").value;
    const amount = document.getElementById("amount").value;
    submitProposal(title, summary, amount);
  };

  setupTabs();
  refreshAdminUI();
});
