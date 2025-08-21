<script>
const rows = [
["Oui", yes],["Non", no],["Abstention", abstain],["Non avec véto", veto],
["Participants", participants],["Base quorum", totalVotingPower],["Quorum atteint", r.quorumReached?"Oui":"Non"],
["% Oui (participants)", (r.yesPct*100).toFixed(1)+"%"],["% Veto (participants)", (r.vetoPct*100).toFixed(1)+"%"],
];
const parts = rows.map(([k,v])=>`<div class="row"><div class="col label">${k}</div><div class="col">${v}</div></div>`).join("");
return `<div class="mt8 muted">${parts}</div>`;
}


function badgeClass(r){
if(!r) return "";
if(!r.quorumReached) return "badge-warn";
if(r.vetoPct >= GOV.vetoPct) return "badge-danger";
if(r.yesPct > GOV.passPct) return "badge-pass";
return "badge-fail";
}
function badgeText(r){
if(!r) return "";
if(!r.quorumReached) return "Échec (pas de quorum)";
if(r.vetoPct >= GOV.vetoPct) return "Rejeté (véto)";
if(r.yesPct > GOV.passPct) return "Adoptée";
return "Rejetée";
}


function exportJSON(){
const blob = new Blob([JSON.stringify({ proposals, roster: Array.from(roster), admin }, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="subversarts_gov_export.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}


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
}


function saveAdmin(){
admin.membersBase = parseInt(byId('membersBase').value||"0",10) || 0;
admin.owner = (byId('ownerAddr').value||"").trim();
save(LS.admin, admin); flash("Paramètres admin enregistrés.");
if(isOwner()) byId("adminSection").classList.remove("hidden");
}


function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
</script>
