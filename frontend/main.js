const API = 'http://localhost:8080/graphql'

async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  const { data, errors } = await res.json()
  if (errors?.length) throw new Error(errors[0].message)
  return data
}

async function fetchRepos() {
  const out = document.getElementById('repos')
  out.innerHTML = '<p class="text-sm text-gray-400">Loading...</p>'
  try {
    const data = await gql(`query { repositories { id name description language stars lastAnalyzed } }`)
    const repos = data.repositories
    out.innerHTML = ''
    if (!repos.length) {
      out.innerHTML = '<p class="text-sm text-gray-500">No repositories yet. Add one above.</p>'
      return
    }
    repos.forEach(repo => renderRepoCard(repo, out))
  } catch (err) {
    out.innerHTML = '<p class="text-sm text-red-500">Could not connect. Is Spring Boot running on :8080?</p>'
  }
}

function renderRepoCard(repo, container) {
  const card = document.createElement('div')
  card.id = `repo-${repo.id}`
  card.className = 'bg-white border border-gray-200 rounded-lg p-5 shadow-sm'
  card.innerHTML = cardHtml(repo)
  container.appendChild(card)
  card.querySelector('.analyze-btn').addEventListener('click', () => triggerAnalysis(repo.id, card))
}

function cardHtml(repo) {
  return `
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-gray-900 truncate">${escapeHtml(repo.name || '')}</div>
        <div class="text-sm text-gray-500 mt-0.5 line-clamp-2">${escapeHtml(repo.description || 'No description')}</div>
        <div class="flex gap-3 mt-2 text-xs text-gray-400">
          ${repo.language ? `<span>● ${escapeHtml(repo.language)}</span>` : ''}
          ${repo.stars != null ? `<span>★ ${repo.stars.toLocaleString()}</span>` : ''}
          ${repo.lastAnalyzed ? `<span>Analyzed ${timeAgo(repo.lastAnalyzed)}</span>` : ''}
        </div>
      </div>
      <button class="analyze-btn shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md transition-colors">
        Analyze
      </button>
    </div>
    <div class="analysis-result mt-4"></div>
  `
}

async function triggerAnalysis(id, card) {
  const btn = card.querySelector('.analyze-btn')
  const result = card.querySelector('.analysis-result')
  btn.disabled = true
  btn.textContent = 'Analyzing…'
  result.innerHTML = spinner()
  try {
    await gql(`mutation($id: ID!) { analyzeRepository(id: $id) }`, { id })
    pollForAnalysis(id, card, btn)
  } catch (err) {
    result.innerHTML = `<p class="text-sm text-red-500">${escapeHtml(err.message)}</p>`
    btn.disabled = false
    btn.textContent = 'Analyze'
  }
}

function pollForAnalysis(id, card, btn) {
  const result = card.querySelector('.analysis-result')
  let attempts = 0
  const interval = setInterval(async () => {
    attempts++
    try {
      const data = await gql(
        `query($id: ID!) { analysis(repositoryId: $id) { summary complexityScore topics } }`,
        { id }
      )
      if (data.analysis) {
        clearInterval(interval)
        result.innerHTML = analysisHtml(data.analysis)
        btn.disabled = false
        btn.textContent = 'Re-analyze'
      } else if (attempts > 24) {
        clearInterval(interval)
        result.innerHTML = '<p class="text-sm text-gray-500">Analysis is taking longer than expected.</p>'
        btn.disabled = false
        btn.textContent = 'Analyze'
      }
    } catch { /* keep polling */ }
  }, 2500)
}

function analysisHtml(a) {
  const score = a.complexityScore
  const label = score <= 3 ? 'Low' : score <= 6 ? 'Medium' : 'High'
  const color = score <= 3 ? 'bg-green-500' : score <= 6 ? 'bg-yellow-500' : 'bg-red-500'
  const pct = Math.round((score / 10) * 100)
  return `
    <div class="border-t pt-4 space-y-3">
      <p class="text-sm text-gray-700">${escapeHtml(a.summary)}</p>
      <div>
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Complexity</span><span>${label} (${score.toFixed(1)}/10)</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2">
          <div class="${color} h-2 rounded-full" style="width:${pct}%"></div>
        </div>
      </div>
      ${a.topics?.length ? `<div class="flex flex-wrap gap-1.5">
        ${a.topics.map(t => `<span class="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">${escapeHtml(t)}</span>`).join('')}
      </div>` : ''}
    </div>`
}

document.getElementById('add-form').addEventListener('submit', async ev => {
  ev.preventDefault()
  const input = document.getElementById('githubUrl')
  const msg = document.getElementById('form-msg')
  const url = input.value.trim()
  if (!url) return
  msg.textContent = ''
  try {
    await gql(`mutation($url: String!) { addRepository(githubUrl: $url) { id } }`, { url })
    input.value = ''
    msg.className = 'mt-2 text-sm text-green-600'
    msg.textContent = 'Repository added.'
    fetchRepos()
  } catch (err) {
    msg.className = 'mt-2 text-sm text-red-500'
    msg.textContent = err.message || 'Failed to add repository.'
  }
})

function spinner() {
  return `<div class="flex items-center gap-2 text-sm text-gray-400">
    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>Running analysis…</div>`
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

fetchRepos()
