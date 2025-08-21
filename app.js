<!DOCTYPE html>
</div>
</div>
<div class="actions">
<button id="exportBtn" class="btn ghost">Exporter les propositions (JSON)</button>
<button id="refreshBtn" class="btn ghost">Rafraîchir l'état</button>
</div>
</section>


<!-- Propositions -->
<section class="card" id="propsSection">
<h2>🗳️ Propositions</h2>
<div class="tabs">
<button class="tab active" data-tab="active">Actives</button>
<button class="tab" data-tab="history">Historique</button>
</div>
<div id="propsActive" class="list"></div>
<div id="propsHistory" class="list hidden"></div>
</section>


<!-- Admin (facultatif) -->
<section class="card hidden" id="adminSection">
<h2>⚙️ Paramètres (Admin)</h2>
<div class="grid2">
<div>
<label class="label">Base membres (pour quorum)</label>
<input id="membersBase" class="input" type="number" min="0" />
</div>
<div>
<label class="label">Adresse Owner (Admin)</label>
<input id="ownerAddr" class="input" />
</div>
</div>
<div class="row">
<button id="saveAdminBtn" class="btn">Enregistrer</button>
<span class="muted tiny">Le quorum est calculé sur cette base en l'absence de registre complet on-chain.</span>
</div>
</section>
</main>


<footer class="footer">
<span>Règles : Quorum 40% • Seuil Oui 50% • Veto 33,4% • Période 14 jours • Droits retirés au proposeur en cas de rejet par véto.</span>
</footer>
</body>
</html>
