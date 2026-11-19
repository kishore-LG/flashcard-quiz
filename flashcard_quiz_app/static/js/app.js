const $ = (id) => document.getElementById(id);
let cards = [], studyCards = [], currentIndex = 0, editingId = null, toastTimer;

function notify(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
async function api(url, options = {}) {
  const response = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(name + "Page").classList.add("active");
  document.querySelectorAll(".nav-item[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  $("crumb").textContent = name === "manage" ? "My flashcards" : name === "study" ? "Study cards" : "Dashboard";
  $("sidebar").classList.remove("open");
  if (name === "manage") loadLibrary();
  if (name === "dashboard") loadDashboard();
  if (name === "study") prepareStudy();
}
document.querySelectorAll(".nav-item[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));
$("mobileMenu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("today").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date());

async function loadDashboard() {
  try {
    const stats = await api("/api/stats");
    $("totalStat").textContent = stats.total; $("knownStat").textContent = stats.known;
    $("revisionStat").textContent = stats.revision; $("percentStat").textContent = stats.percent + "%";
    $("progressPercent").textContent = stats.percent + "%"; $("ringText").textContent = stats.percent + "%";
    $("progressBar").style.width = stats.percent + "%";
    $("progressRing").style.background = `conic-gradient(#7064e8 ${stats.percent*3.6}deg,#eeedfa 0deg)`;
    const recent = await api("/api/cards");
    $("recentCards").innerHTML = recent.length ? recent.slice(0,3).map(c => `<div class="recent-item"><b>${escapeHtml(c.question)}</b><small>${escapeHtml(c.category)} · ${c.created_at}</small></div>`).join("") : '<div class="empty-state">No flashcards yet. Add your first card to get started.</div>';
  } catch(e) { notify(e.message); }
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

async function loadLibrary() {
  try {
    const search = $("searchInput").value.trim();
    const category = $("categoryFilter").value;
    const params = new URLSearchParams(); if (search) params.set("search", search); if (category) params.set("category", category);
    cards = await api("/api/cards?" + params.toString());
    renderCards();
    const all = await api("/api/cards");
    const selected = $("categoryFilter").value;
    const categories = [...new Set(all.map(c => c.category))].sort();
    $("categoryFilter").innerHTML = '<option value="All">All subjects</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    $("categoryFilter").value = categories.includes(selected) ? selected : "All";
  } catch(e) { notify(e.message); }
}
function renderCards() {
  $("resultCount").textContent = `${cards.length} card${cards.length===1?"":"s"}`;
  $("cardGrid").innerHTML = cards.length ? cards.map(c => `<article class="library-card">
    <div class="library-card-top"><span class="category-tag">${escapeHtml(c.category)}</span><span class="status-label">${c.status==="known"?"✓ Known":c.status==="revision"?"↻ Revision":"New"}</span></div>
    <h3>${escapeHtml(c.question)}</h3><div class="answer-preview">${escapeHtml(c.answer)}</div>
    <div class="library-card-foot"><small>Added ${c.created_at}</small><div class="card-actions"><button class="icon-btn" title="Edit" data-edit="${c.id}">✎</button><button class="icon-btn" title="Delete" data-delete="${c.id}">⌫</button></div></div></article>`).join("") : '<div class="empty-state">No matching flashcards found. Try another search or add a card.</div>';
  document.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openEdit(Number(b.dataset.edit))));
  document.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteCard(Number(b.dataset.delete))));
}
$("searchInput").addEventListener("input", debounce(loadLibrary, 220));
$("categoryFilter").addEventListener("change", loadLibrary);
function debounce(fn, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }

function openModal(card=null) {
  editingId = card ? card.id : null;
  $("modalTitle").textContent = card ? "Edit flashcard" : "Create flashcard";
  $("questionInput").value = card?.question || ""; $("answerInput").value = card?.answer || "";
  $("categoryInput").value = card?.category || "General";
  $("cardModal").classList.add("show"); $("questionInput").focus();
}
function closeModal() { $("cardModal").classList.remove("show"); $("cardForm").reset(); editingId=null; }
$("addCardBtn").addEventListener("click", () => openModal());
$("addFromDash").addEventListener("click", () => { showPage("manage"); openModal(); });
$("closeModal").addEventListener("click", closeModal); $("cancelModal").addEventListener("click", closeModal);
$("cardModal").addEventListener("click", e => { if (e.target === $("cardModal")) closeModal(); });
function openEdit(id) { const card = cards.find(c => c.id === id); if (card) openModal(card); }
$("cardForm").addEventListener("submit", async e => {
  e.preventDefault();
  const payload = {question:$("questionInput").value.trim(), answer:$("answerInput").value.trim(), category:$("categoryInput").value.trim() || "General"};
  if (!payload.question || !payload.answer) { notify("Please enter both a question and an answer."); return; }
  try {
    await api(editingId ? `/api/cards/${editingId}` : "/api/cards", {method:editingId?"PUT":"POST",body:JSON.stringify(payload)});
    closeModal(); notify(editingId ? "Flashcard updated." : "Flashcard created."); await loadLibrary(); await loadDashboard();
  } catch(e) { notify(e.message); }
});
async function deleteCard(id) {
  if (!confirm("Delete this flashcard? This action cannot be undone.")) return;
  try { await api(`/api/cards/${id}`,{method:"DELETE"}); notify("Flashcard deleted."); await loadLibrary(); await loadDashboard(); }
  catch(e) { notify(e.message); }
}

async function prepareStudy() {
  try {
    const mode = $("studyMode").value;
    let list = await api("/api/cards");
    if (mode === "revision") list = list.filter(c => c.status !== "known");
    if (mode === "random") list = list.sort(() => Math.random() - .5);
    studyCards = list; currentIndex = 0; renderStudyCard();
  } catch(e) { notify(e.message); }
}
$("studyMode").addEventListener("change", prepareStudy);
function renderStudyCard() {
  $("flashcard").classList.remove("flipped");
  const card = studyCards[currentIndex];
  if (!card) {
    $("studyCategory").textContent = "NO CARDS"; $("cardCounter").textContent = "Card 0 of 0";
    $("questionText").textContent = "Your study deck is empty."; $("answerText").textContent = "Add flashcards in My flashcards to begin.";
    $("frontNumber").textContent = "00"; $("sessionProgressText").textContent = "0 / 0"; $("sessionProgressBar").style.width="0%";
    return;
  }
  $("studyCategory").textContent = card.category.toUpperCase();
  $("cardCounter").textContent = `Card ${currentIndex+1} of ${studyCards.length}`;
  $("frontNumber").textContent = String(currentIndex+1).padStart(2,"0");
  $("questionText").textContent = card.question; $("answerText").textContent = card.answer;
  $("sessionProgressText").textContent = `${currentIndex+1} / ${studyCards.length}`;
  $("sessionProgressBar").style.width = `${((currentIndex+1)/studyCards.length)*100}%`;
}
$("showAnswerBtn").addEventListener("click", () => { if(studyCards.length) $("flashcard").classList.toggle("flipped"); });
$("flashcard").addEventListener("click", () => { if(studyCards.length) $("flashcard").classList.toggle("flipped"); });
$("previousBtn").addEventListener("click", () => { if(!studyCards.length)return; currentIndex=Math.max(0,currentIndex-1); renderStudyCard(); });
$("nextBtn").addEventListener("click", () => {
  if(!studyCards.length)return;
  if(currentIndex < studyCards.length-1) { currentIndex++; renderStudyCard(); }
  else { $("completionText").textContent = `You reached the end of your ${studyCards.length}-card study session. Keep up the great work!`; $("completionModal").classList.add("show"); }
});
async function markCard(status) {
  const card=studyCards[currentIndex]; if(!card)return;
  try {
    await api(`/api/cards/${card.id}/progress`,{method:"POST",body:JSON.stringify({status})});
    card.status=status; notify(status==="known"?"Marked as known.":"Added to revision list.");
    await loadDashboard();
    if(currentIndex < studyCards.length-1) { currentIndex++; renderStudyCard(); }
    else { $("completionText").textContent=`You reviewed ${studyCards.length} card${studyCards.length===1?"":"s"}. Great effort!`; $("completionModal").classList.add("show"); }
  } catch(e) { notify(e.message); }
}
$("markKnown").addEventListener("click",()=>markCard("known"));
$("markRevision").addEventListener("click",()=>markCard("revision"));
$("finishSession").addEventListener("click",()=>{$("completionModal").classList.remove("show");showPage("dashboard");});
$("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("flashlearn-dark",document.body.classList.contains("dark")?"1":"0");});
if(localStorage.getItem("flashlearn-dark")==="1")document.body.classList.add("dark");
$("startStudy").addEventListener("click",()=>showPage("study"));
$("resetProgress")?.addEventListener("click",async()=>{if(confirm("Reset all study progress?")){await api("/api/progress/reset",{method:"POST"});await loadDashboard();}});
loadDashboard();
