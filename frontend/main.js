const API = window.API_BASE || 'http://localhost:8000/api'

// ── Language color map (GitHub standard colors) ─────────────────────────────
const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', Kotlin: '#F18E33',
  Swift: '#ffac45', PHP: '#4F5D95', Scala: '#c22d40', Shell: '#89e051',
  HTML: '#e34c26', CSS: '#563d7c', Dart: '#00B4AB', Elixir: '#6e4a7e',
}

function langColor(lang) {
  return LANG_COLORS[lang] || '#94a3b8'
}

// ── Complexity helpers ───────────────────────────────────────────────────────
function complexityLabel(score) {
  if (score <= 3)  return { label: 'Low',    cls: 'bg-emerald-100 text-emerald-700' }
  if (score <= 6)  return { label: 'Medium', cls: 'bg-amber-100 text-amber-700' }
  return               { label: 'High',   cls: 'bg-rose-100 text-rose-700' }
}

function complexityBarColor(score) {
  if (score <= 3) return 'bg-emerald-500'
  if (score <= 6) return 'bg-amber-500'
  return 'bg-rose-500'
}

// ── Number formatting ────────────────────────────────────────────────────────
function fmtStars(n) {
  if (!n && n !== 0) return null
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function timeAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── HTML escaping ────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return ''
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Toast notifications ──────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container')
  const el = document.createElement('div')
  const icon = type === 'success'
    ? `<svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
    : `<svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`
  el.className = 'toast flex items-center gap-2.5 bg-white border border-slate-200 shadow-lg rounded-lg px-4 py-3 text-sm text-slate-700 max-w-xs'
  el.innerHTML = `${icon}<span>${esc(msg)}</span>`
  container.appendChild(el)
  setTimeout(() => el.remove(), 3100)
}

// ── State: which repos are currently being analyzed ──────────────────────────
const analyzingSet = new Set()

// ── Render a single repo card ─────────────────────────────────────────────────
function renderCard(repo, analysis) {
  const stars = fmtStars(repo.stars)
  const lang  = repo.language
  const ago   = timeAgo(repo.last_analyzed)
  const isAnalyzing = analyzingSet.has(repo.id)

  const langBadge = lang
    ? `<span class="inline-flex items-center gap-1.5 text-xs text-slate-600">
         <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${langColor(lang)}"></span>
         ${esc(lang)}
       </span>`
    : ''

  const starBadge = stars
    ? `<span class="inline-flex items-center gap-1 text-xs text-slate-500">
         <svg class="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
         ${esc(stars)}
       </span>`
    : ''

  const analyzeBtn = isAnalyzing
    ? `<button disabled class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-400 cursor-not-allowed">
         <span class="spinner"></span> Analyzing…
       </button>`
    : `<button data-id="${esc(repo.id)}" class="analyze-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors">
         <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
         ${analysis ? 'Re-analyze' : 'Analyze'}
       </button>`

  let analysisHtml = ''
  if (analysis && analysis.summary && analysis.summary !== 'Analysis queued') {
    const cmplx = complexityLabel(analysis.complexity_score)
    const barPct = Math.round((analysis.complexity_score / 10) * 100)
    const barColor = complexityBarColor(analysis.complexity_score)
    const topics = Array.isArray(analysis.topics) ? analysis.topics : []

    const topicChips = topics.map(t =>
      `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">${esc(t)}</span>`
    ).join('')

    analysisHtml = `
      <div class="analysis-panel mt-4 pt-4 border-t border-slate-100">
        <p class="text-sm text-slate-600 leading-relaxed mb-4">${esc(analysis.summary)}</p>
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[180px]">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-slate-500">Complexity</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium ${cmplx.cls}">${cmplx.label} · ${analysis.complexity_score.toFixed(1)}</span>
            </div>
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="complexity-bar-fill h-full rounded-full ${barColor}" style="width:${barPct}%"></div>
            </div>
          </div>
          ${topics.length ? `<div class="flex flex-wrap gap-1.5">${topicChips}</div>` : ''}
        </div>
        ${analysis.created_at ? `<p class="text-xs text-slate-400 mt-3">Analyzed ${timeAgo(analysis.created_at)}</p>` : ''}
      </div>`
  }

  const card = document.createElement('div')
  card.className = 'repo-card bg-white rounded-xl border border-slate-200 p-5 card-enter'
  card.dataset.id = repo.id
  card.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <a href="${esc(String(repo.github_url))}" target="_blank" rel="noopener"
             class="font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate">
            ${esc(repo.name || String(repo.github_url))}
          </a>
        </div>
        ${repo.description ? `<p class="text-sm text-slate-500 mb-3 line-clamp-2">${esc(repo.description)}</p>` : '<div class="mb-3"></div>'}
        <div class="flex items-center flex-wrap gap-3">
          ${langBadge}
          ${starBadge}
          ${ago ? `<span class="text-xs text-slate-400">analyzed ${ago}</span>` : ''}
        </div>
      </div>
      <div class="shrink-0">${analyzeBtn}</div>
    </div>
    ${analysisHtml}
  `

  // Wire analyze button
  const btn = card.querySelector('.analyze-btn')
  if (btn) {
    btn.addEventListener('click', () => triggerAnalysis(repo.id, card))
  }

  return card
}

// ── Trigger analysis + poll for result ───────────────────────────────────────
async function triggerAnalysis(id, card) {
  analyzingSet.add(id)
  refreshCard(card, id)

  try {
    await fetch(`${API}/analyze/${id}`, { method: 'POST' })
  } catch {
    toast('Failed to trigger analysis', 'error')
    analyzingSet.delete(id)
    refreshCard(card, id)
    return
  }

  // Poll every 2.5s for up to 90s
  const deadline = Date.now() + 90_000
  const poll = setInterval(async () => {
    if (Date.now() > deadline) {
      clearInterval(poll)
      analyzingSet.delete(id)
      toast('Analysis is taking longer than expected — try refreshing', 'error')
      refreshCard(card, id)
      return
    }
    try {
      const res = await fetch(`${API}/analyze/${id}`)
      if (res.ok) {
        const analysis = await res.json()
        if (analysis.summary && analysis.summary !== 'Analysis queued') {
          clearInterval(poll)
          analyzingSet.delete(id)
          // Fetch fresh repo data then re-render card
          const repoRes = await fetch(`${API}/repositories/${id}`)
          const repo = repoRes.ok ? await repoRes.json() : { id, github_url: '', name: id }
          const newCard = renderCard(repo, analysis)
          card.replaceWith(newCard)
          toast('Analysis complete!')
        }
      }
    } catch { /* keep polling */ }
  }, 2500)
}

// ── Re-render just the button state on an existing card ──────────────────────
async function refreshCard(card, id) {
  try {
    const [repoRes, analysisRes] = await Promise.all([
      fetch(`${API}/repositories/${id}`),
      fetch(`${API}/analyze/${id}`),
    ])
    const repo = repoRes.ok ? await repoRes.json() : null
    const analysis = analysisRes.ok ? await analysisRes.json() : null
    if (repo) {
      const newCard = renderCard(repo, analysis)
      card.replaceWith(newCard)
    }
  } catch { /* best effort */ }
}

// ── Load all repos ────────────────────────────────────────────────────────────
async function loadRepos() {
  const container   = document.getElementById('repos')
  const emptyState  = document.getElementById('empty-state')
  const loadingState = document.getElementById('loading-state')
  const countBadge  = document.getElementById('repo-count')

  loadingState.classList.remove('hidden')
  emptyState.classList.add('hidden')
  container.innerHTML = ''

  let repos = []
  try {
    const res = await fetch(`${API}/repositories`)
    if (!res.ok) throw new Error('fetch failed')
    repos = await res.json()
    if (!Array.isArray(repos)) repos = []
  } catch {
    loadingState.classList.add('hidden')
    toast('Could not connect to the API — is FastAPI running?', 'error')
    return
  }

  loadingState.classList.add('hidden')

  if (repos.length === 0) {
    emptyState.classList.remove('hidden')
    countBadge.textContent = ''
    return
  }

  countBadge.textContent = `${repos.length} ${repos.length === 1 ? 'repo' : 'repos'}`

  // Fetch analyses in parallel
  const analyses = await Promise.all(
    repos.map(async repo => {
      try {
        const res = await fetch(`${API}/analyze/${repo.id}`)
        return res.ok ? await res.json() : null
      } catch { return null }
    })
  )

  repos.forEach((repo, i) => {
    container.appendChild(renderCard(repo, analyses[i]))
  })
}

// ── Add repo form ─────────────────────────────────────────────────────────────
document.getElementById('add-form').addEventListener('submit', async ev => {
  ev.preventDefault()
  const input = document.getElementById('githubUrl')
  const btn   = document.getElementById('add-btn')
  const url   = input.value.trim()
  if (!url) return

  btn.disabled = true
  btn.innerHTML = `<span class="spinner"></span> Adding…`

  try {
    const res = await fetch(`${API}/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_url: url }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    input.value = ''
    toast('Repository added successfully!')
    await loadRepos()
  } catch (err) {
    toast(err.message || 'Failed to add repository', 'error')
  } finally {
    btn.disabled = false
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add Repository`
  }
})

loadRepos()
