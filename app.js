// ===================== CONFIG =====================
const CHAIN_ID = "secret-4";
const LCD_ENDPOINT = "https://lcd.secret.express";

// >>> Remplace par TES collections + token IDs autorisés <<<
const ALLOWLIST = [
  // Exemple :
  { address: "secret1examplecontractaddrxxxxxxxxxxxxxxx0", name: "Ma Collection #1", allowedTokenIds: ["1", "42"] },
  // { address: "secret1votrecontrat...", name: "Nom", allowedTokenIds: ["7","99"] },
];

// LocalStorage keys
const LS = {
  vk: "dao_vk",              // { [contractAddr]: viewingKey }
  proposals: "dao_proposals" // Proposal[]
};

// ===================== STATE =====================
let address = null;
let snClient = null;
let viewingKeys = load(LS.vk, {});
let proposals = load(LS.proposals, []);

// ===================== UTIL =====================
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function short(addr, n=6) {
  return addr ? addr.slice(0, n) + "…" + addr.slice(-n) : "";
}
function byId(id) { return document.getElementById(id); }

// ===================== INIT UI =====================
document.addEventListener("DOMContentLoaded", () => {
  const openNewTab = byId("openNewTab");
  openNewTab.href = window.location.href;

  renderCollectionsVK();
  renderProposals();

  // Keplr detection UX
  if (!("keplr" in window)) {
    byId("keplrWarn").classList.remove("hidden");
  }

  // Bind actions
  byId("connectBtn").onclick     = connectKeplr;
  byId("checkNftBtn").onclick    = checkNftGate;
  byId("addProposalBtn").onclick = addProposal;
  byId("exportBtn").onclick      = exportJSON;
});

// ===================== KEPLR / SECRETJS =====================
async function connectKeplr() {
  try {
    if (!window.keplr) {
      alert("Keplr non détecté. Ouvrez cette page dans un nouvel onglet (hors iframe) ou installez l'extension.");
      return;
    }

    // Keplr supporte déjà Secret Network. Si besoin, on pourrait faire experimentalSuggestChain.
    await window.keplr.enable(CHAIN_ID);
    const offlineSigner = window.getOfflineSignerOnlyAmino(CHAIN_ID);
    const [{ address: myAddr }] = await offlineSigner.getAccounts();

    snClient = await secretjs.SecretNetworkClient.create({
      chainId: CHAIN_ID,
      url: LCD_ENDPOINT,
      wallet: offlineSigner,
      walletAddress: myAddr,
      encryptionUtils: window.getEnigmaUtils ? window.getEnigmaUtils(CHAIN_ID) : undefined,
    });

    address = myAddr;
    byId("walletAddress").textContent = `Connecté : ${short(address, 8)}`;
    byId("vkSection").classList.remove("hidden");
  } catch (e) {
    console.error(e);
    alert("Erreur de connexion Keplr : " + (e?.message || String(e)));
  }
}

// ===================== VIEWING KEYS UI =====================
function renderCollectionsVK() {
  const container = byId("collectionsList");
  container.innerHTML = "";

  ALLOWLIST.forEach(col => {
    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
      <div class="col">
        <div class="label">${col.name}</div>
        <div class="muted small">${col.address}</div>
        <div class="muted tiny">IDs autorisés : ${col.allowedTokenIds.join(", ")}</div>
      </div>
      <div class="col grow">
        <input class="input" placeholder="Viewing key pour ${col.name}" value="${viewingKeys[col.address] || ""}" />
      </div>
      <div class="col">
        <button class="btn">Enregistrer</button>
      </div>
    `;

    const input  = row.querySelector("input");
    const button = row.querySelector("button");
    button.onclick = () => {
      const v = (input.value || "").trim();
      if (!v) {
        delete viewingKeys[col.address];
      } else {
        viewingKeys[col.address] = v;
      }
      save(LS.vk, viewingKeys);
      flash("Viewing key enregistrée.");
    };

    container.appendChild(row);
  });
}

function flash(msg) {
  const el = document.createElement("div");
  el.className = "flash";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ===================== NFT GATE (SNIP-721) =====================
async function checkNftGate() {
  if (!snClient || !address) { alert("Connectez Keplr d'abord."); return; }

  const msgEl = byId("nftMessage");
  msgEl.textContent = "Vérification en cours…";

  try {
    for (const col of ALLOWLIST) {
      const vk = viewingKeys[col.address];
      const allowed = new Set((col.allowedTokenIds || []).map(String));
      if (!vk || allowed.size === 0) continue;

      let found = null;
      let start_after;
      while (true) {
        const query = { tokens: { owner: address, viewing_key: vk, limit: 50 } };
        if (start_after) query.tokens.start_after = start_after;

        const resp = await snClient.query.compute.queryContract({
          contract_address: col.address,
          query
        });

        const tokens = resp?.token_list?.tokens || [];
        for (const t of tokens) {
          if (allowed.has(String(t))) { found = String(t); break; }
        }
        if (found || tokens.length < 50) break;
        start_after = tokens[tokens.length - 1];
      }

      if (found) {
        msgEl.textContent = `✅ Accès validé via ${col.name} (NFT #${found}).`;
        byId("govSection").classList.remove("hidden");
        byId("listSection").classList.remove("hidden");
        return;
      }
    }
    msgEl.textContent = "❌ Aucun NFT autorisé trouvé. Vérifiez vos viewing keys et IDs.";
  } catch (e) {
    console.error(e);
    msgEl.textContent = "Erreur SNIP-721 : " + (e?.message || String(e));
  }
}

// ===================== PROPOSITIONS & VOTES =====================
function renderProposals() {
  const container = byId("proposals");
  container.innerHTML = "";

  proposals.forEach(p => {
    const card = document.createElement("div");
    card.className = "item";

    const myVote = address ? p.votes?.[address] : undefined;

    card.innerHTML = `
      <div class="item-title">${p.title}</div>
      <div class="item-desc">${p.description}</div>
      <div class="item-actions">
        <button class="btn ${myVote==='oui' ? 'active' : ''}">Oui</button>
        <button class="btn ${myVote==='non' ? 'active' : ''}">Non</button>
        <span class="muted tiny">Votes: ${Object.keys(p.votes||{}).length}</span>
      </div>
    `;

    const [btnOui, btnNon] = card.querySelectorAll("button");
    btnOui.onclick = () => vote(p, "oui");
    btnNon.onclick = () => vote(p, "non");

    container.appendChild(card);
  });
}

function addProposal() {
  const t = byId("titleInput").value.trim();
  const d = byId("descInput").value.trim();
  if (!t || !d) return;

  const newP = { id: Date.now().toString(), title: t, description: d, votes: {} };
  proposals.push(newP);
  save(LS.proposals, proposals);
  byId("titleInput").value = "";
  byId("descInput").value = "";
  renderProposals();
}

async function vote(prop, choice) {
  if (!address || !window.keplr) { alert("Connectez Keplr."); return; }
  try {
    // Signature off-chain (pour audit ultérieur)
    await window.keplr.signArbitrary(CHAIN_ID, address, `vote:${prop.id}:${choice}`);
    prop.votes = prop.votes || {};
    prop.votes[address] = choice;
    save(LS.proposals, proposals);
    renderProposals();
  } catch (e) {
    alert("Signature annulée / erreur.");
  }
}

function exportJSON() {
  const blob = new Blob([JSON.stringify({ proposals }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "gouvernance_proposals.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

