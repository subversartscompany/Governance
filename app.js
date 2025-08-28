/*************************************************************
 * DAO Gouvernance (Netlify-ready)
 * Plus aucun fetch → Config inline dans index.html
 *************************************************************/

let CONFIG = window.DAO_GOVERNANCE;
let COLLECTIONS = window.DAO_COLLECTIONS;
let MEMBERS = window.DAO_MEMBERS;

let PROPOSALS = [];
let USER = { address: null, viewingKeys: {}, isPermissive: false, banned: false };

// Connexion Keplr
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

// Créer une Viewing Key
async function createViewingKey(contractAddr) {
  if (!window.keplr) return alert("Keplr non détecté");
  try {
    // simulation VK (pas d'appel réseau dans cette démo)
    const vk = "vk_" + Math.random().toString(36).substring(2,10);
    USER.viewingKeys[contractAddr] = vk;
    console.log("VK créée pour", contractAddr, ":", vk);
    alert("Viewing key créée pour " + contractAddr);
    await checkPermissiveRights();
  } catch (err) {
    console.error("Erreur VK :", err);
  }
}

// Vérifier droits NFT
async function checkPermissiveRights() {
  USER.isPermissive = false;

  for (let col of COLLECTIONS) {
    const vk = USER.viewingKeys[col.contract];
    if (!vk) continue;
    // Simu: 50% chance
    const hasNft = Math.random() > 0.5;
    if (hasNft) { USER.isPermissive = true; break; }
  }

  if (USER.isPermissive && !USER.banned) {
    document.getElementById("governanceSection").style.display = "block";
  } else {
    document.getElementById("governanceSection").style.display = "none";
  }
}

// Nouvelle proposition
function submitProposal(title, summary, amount) {
  if (!USER.isPermissive || USER.banned) {
    alert("Pas autorisé à soumettre.");
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

// Vote
function vote(proposalId, choice) {
  const prop = PROPOSALS.find(p => p.id === proposalId);
  if (!prop) return;
  if (!USER.isPermissive || USER.banned) {
    alert("Pas autorisé à voter.");
    return;
  }
  prop.votes[USER.address] = choice;
  saveProposals();
  renderProposals();
}

// Sauvegarde localStorage
function saveProposals() { localStorage.setItem("proposals", JSON.stringify(PROPOSALS)); }
function loadProposals() { PROPOSALS = JSON.parse(localStorage.getItem("proposals") || "[]"); }

// Rendu des propositions
function renderProposals() {
  const active = document.getElementById("proposalsList");
  const history = document.getElementById("historyList");
  active.innerHTML = "";
  history.innerHTML = "";

  PROPOSALS.forEach(p => {
    const votes = Object.values(p.votes);
    const yes = votes.filter(v => v === "yes").length;
    const no = votes.filter(v => v === "no").length;
    const abstain = votes.filter(v => v === "abstain").length;
    const veto = votes.filter(v => v === "veto").length;
    const participants = votes.length;

    const div = document.createElement("div");
    div.className = "proposal";
    div.innerHTML = `
      <h3>${p.title}</h3>
      <p><b>Résumé:</b> ${p.summary}</p>
      <p><b>Montant:</b> ${p.amount}</p>
      <p><b>Votes:</b> Oui(${yes}) / Non(${no}) / Abstention(${abstain}) / Véto(${veto})</p>
      <button onclick="vote(${p.id}, 'yes')">Oui</button>
      <button onclick="vote(${p.id}, 'no')">Non</button>
      <button onclick="vote(${p.id}, 'abstain')">S'abstenir</button>
      <button onclick="vote(${p.id}, 'veto')">Véto</button>
    `;

    if (p.status === "active") active.appendChild(div);
    else history.appendChild(div);
  });
}

// Tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t=> t.onclick = () => {
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.getAttribute('data-tab');
    document.getElementById('propsActive').classList.toggle('hidden', tab!=="active");
    document.getElementById('propsHistory').classList.toggle('hidden', tab!=="history");
  });
}

// Init
window.addEventListener("load", () => {
  loadProposals();
  renderProposals();
  setupTabs();

  document.getElementById("btnConnect").onclick = connectKeplr;
  document.getElementById("btnCreateVK").onclick = () => {
    if (COLLECTIONS.length>0) createViewingKey(COLLECTIONS[0].contract);
  };
  document.getElementById("btnSubmitProposal").onclick = () => {
    const title = document.getElementById("title").value;
    const summary = document.getElementById("summary").value;
    const amount = document.getElementById("amount").value;
    submitProposal(title, summary, amount);
  };
});
