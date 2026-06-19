/**
 * @module main
 * @description EcoTrack – Main Application Controller
 * Orchestrates the UI, state management, security, and external services.
 */

import './style.css'
import { calculateFootprint, getPersonalizedInsights, getBenchmarkComparison, GLOBAL_AVG_KG, PARIS_TARGET_KG } from './calculator'
import { getDistanceWithGoogleMaps } from './googleServices'

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_HISTORY = 12
const ECO_FACTS = [
  '💡 The average global carbon footprint is <strong>4.8 tonnes CO₂e per year</strong> — the Paris Agreement target is 2.3 tonnes.',
  '🌊 Aviation accounts for roughly <strong>2.5% of global CO₂ emissions</strong>, but its warming effect is ~3x higher due to contrails.',
  '🥩 A meat-based diet generates <strong>2× more CO₂</strong> than a plant-based diet on average.',
  '🏠 Heating and cooling homes accounts for <strong>~17% of global energy-related emissions</strong>.',
  '♻️ Sending 1 kg of waste to landfill emits up to <strong>0.52 kg CO₂e</strong> — composting cuts that by 98%.'
]

// ─── State ────────────────────────────────────────────────────────────────────

/** @type {{ history: Array, lastBreakdown: Object|null }} */
const state = {
  history: _safeParseJSON(localStorage.getItem('ecoTrackHistory'), []),
  lastBreakdown: null
}

// ─── Security: Input Sanitization ────────────────────────────────────────────

/**
 * Sanitizes a value to safe plain text – prevents XSS injection.
 * @param {*} value
 * @returns {string} HTML-escaped string
 */
function sanitize(value) {
  const div = document.createElement('div')
  div.textContent = String(value ?? '')
  return div.innerHTML
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Safely parses JSON; returns `fallback` on any error.
 * @param {string|null} jsonStr
 * @param {*} fallback
 */
function _safeParseJSON(jsonStr, fallback) {
  try {
    return JSON.parse(jsonStr) ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Persists application state to LocalStorage.
 */
function saveState () {
  try {
    localStorage.setItem('ecoTrackHistory', JSON.stringify(state.history))
  } catch (e) {
    console.warn('EcoTrack: Failed to persist history.', e)
  }
}

/**
 * Rotates eco facts on the banner every 6 seconds.
 */
function initFactRotator() {
  const factEl = document.getElementById('eco-fact')
  if (!factEl) return
  let index = 0
  setInterval(() => {
    index = (index + 1) % ECO_FACTS.length
    factEl.style.opacity = '0'
    setTimeout(() => {
      factEl.innerHTML = ECO_FACTS[index]
      factEl.style.opacity = '1'
    }, 300)
  }, 6000)
  factEl.style.transition = 'opacity 0.3s ease'
}

// ─── Renderers ───────────────────────────────────────────────────────────────

/**
 * Renders the calculation history list.
 */
function renderHistory() {
  const historyList = document.getElementById('history-list')
  if (!historyList) return

  if (state.history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No calculations yet. Start tracking today!</p>'
    return
  }

  historyList.innerHTML = state.history.map((item) => `
    <div class="history-item" role="listitem">
      <span class="history-date">${sanitize(new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</span>
      <span class="history-score" aria-label="${sanitize(item.total)} kilograms CO2">${sanitize(item.total.toLocaleString())} kg</span>
    </div>
  `).join('')
}

/**
 * Renders the personalised insights roadmap.
 * @param {Array} insights
 */
function renderInsights(insights) {
  const container = document.getElementById('insights')
  if (!container) return

  container.innerHTML = insights.map((insight, idx) => `
    <article class="insight-card ${sanitize(insight.impact.toLowerCase())}" role="listitem" aria-labelledby="insight-cat-${idx}">
      <span class="insight-icon" aria-hidden="true">${sanitize(insight.icon)}</span>
      <div class="insight-header">
        <span id="insight-cat-${idx}" class="category-tag">${sanitize(insight.category)}</span>
        <span class="impact-tag" aria-label="${sanitize(insight.impact)} impact">${sanitize(insight.impact)} Impact</span>
      </div>
      <p>${sanitize(insight.text)}</p>
      <span class="insight-saving" aria-label="Potential saving: ${sanitize(insight.saving)}">💾 ${sanitize(insight.saving)}</span>
    </article>
  `).join('')
}

/**
 * Renders the emissions breakdown bar chart.
 * @param {Object} breakdown - Result from calculateFootprint
 */
function renderBreakdownChart(breakdown) {
  const container = document.getElementById('breakdown-chart')
  if (!container || !breakdown) return

  const categories = [
    { key: 'transport', label: '🚗 Transport' },
    { key: 'energy',    label: '⚡ Energy' },
    { key: 'diet',      label: '🍽️ Diet' },
    { key: 'waste',     label: '🗑️ Waste' },
    { key: 'lifestyle', label: '🛒 Lifestyle' }
  ]

  const maxVal = Math.max(...categories.map(c => breakdown[c.key] || 0), 1)

  container.innerHTML = categories.map(({ key, label }) => {
    const val = breakdown[key] || 0
    const pct = Math.round((val / maxVal) * 100)
    return `
      <div class="breakdown-bar-item">
        <div class="breakdown-bar-label">
          <span>${sanitize(label)}</span>
          <span>${sanitize(val.toLocaleString())} kg</span>
        </div>
        <div class="breakdown-bar-bg" role="presentation">
          <div
            class="breakdown-bar-fill"
            style="width: ${pct}%"
            aria-valuenow="${val}"
            aria-valuemin="0"
            aria-valuemax="${sanitize(maxVal)}"
            aria-label="${sanitize(label)}: ${sanitize(val)} kg CO2e"
          ></div>
        </div>
      </div>
    `
  }).join('')
}

/**
 * Renders the benchmark comparison chart.
 * @param {number} total - User's total footprint
 */
function renderBenchmarkChart(total) {
  const card = document.getElementById('benchmark-card')
  const container = document.getElementById('benchmark-chart')
  if (!card || !container) return

  card.style.display = 'block'
  const maxScale = Math.max(total, GLOBAL_AVG_KG, PARIS_TARGET_KG)

  const bars = [
    { label: 'You', value: total,          color: 'bar-you',    display: `${total.toLocaleString()} kg` },
    { label: 'Global Avg', value: GLOBAL_AVG_KG, color: 'bar-global', display: `${GLOBAL_AVG_KG.toLocaleString()} kg` },
    { label: 'Paris Target', value: PARIS_TARGET_KG, color: 'bar-paris', display: `${PARIS_TARGET_KG.toLocaleString()} kg` }
  ]

  container.innerHTML = bars.map(bar => {
    const pct = Math.min(Math.round((bar.value / maxScale) * 100), 100)
    return `
      <div class="benchmark-bar-group">
        <div class="benchmark-label">
          <span>${sanitize(bar.label)}</span>
          <span>${sanitize(bar.display)}</span>
        </div>
        <div class="benchmark-bar-bg" role="presentation">
          <div
            class="benchmark-bar-fill ${sanitize(bar.color)}"
            style="width: ${pct}%"
            aria-label="${sanitize(bar.label)}: ${sanitize(bar.display)}"
          ></div>
        </div>
      </div>
    `
  }).join('')
}

// ─── App Initialization ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form             = document.getElementById('footprint-form')
  const totalScoreEl     = document.getElementById('total-score')
  const resultsSection   = document.getElementById('results')
  const estimateBtn      = document.getElementById('estimate-distance-btn')
  const clearHistoryBtn  = document.getElementById('clear-history')

  if (!form || !totalScoreEl || !resultsSection) {
    console.error('EcoTrack: Critical DOM elements missing.')
    return
  }

  // Initial renders
  renderHistory()
  initFactRotator()

  // ─── Google Services: Distance Estimation ──────────────────────────────────
  estimateBtn?.addEventListener('click', async () => {
    const originalText = estimateBtn.textContent
    estimateBtn.textContent = 'Analysing…'
    estimateBtn.disabled = true
    estimateBtn.setAttribute('aria-busy', 'true')

    try {
      const distance = await getDistanceWithGoogleMaps('Home', 'Workplace')
      const distInput = document.getElementById('transportDistance')
      if (distInput) {
        distInput.value = distance
        distInput.dispatchEvent(new Event('input'))
      }
    } catch (error) {
      console.error('EcoTrack: Distance service error:', error.message)
      // Non-blocking – user can manually enter distance
      const distInput = document.getElementById('transportDistance')
      if (distInput) distInput.placeholder = 'Enter manually'
    } finally {
      estimateBtn.textContent = originalText
      estimateBtn.disabled = false
      estimateBtn.removeAttribute('aria-busy')
    }
  })

  // ─── Clear History ─────────────────────────────────────────────────────────
  clearHistoryBtn?.addEventListener('click', () => {
    if (confirm('Clear all tracking history? This cannot be undone.')) {
      state.history = []
      saveState()
      renderHistory()
    }
  })

  // ─── Form Submission ───────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault()

    const fd = new FormData(form)

    /** @type {Object} Validated + sanitized input */
    const data = {
      transportType:     sanitize(fd.get('transportType')    || 'car'),
      transportDistance: Math.max(0, parseFloat(fd.get('transportDistance')) || 0),
      energyType:        sanitize(fd.get('energyType')       || 'electricity'),
      energyUsage:       Math.max(0, parseFloat(fd.get('energyUsage'))   || 0),
      dietType:          sanitize(fd.get('dietType')         || 'meat'),
      wasteType:         sanitize(fd.get('wasteType')        || 'landfill'),
      weeklyWaste:       Math.max(0, parseFloat(fd.get('weeklyWaste'))    || 0),
      lifestyleLevel:    sanitize(fd.get('lifestyleLevel')   || 'average')
    }

    const breakdown = calculateFootprint(data)
    state.lastBreakdown = breakdown

    // Update state and persist
    state.history.unshift({ date: new Date().toISOString(), ...breakdown, data })
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY
    saveState()
    renderHistory()

    // Update score display
    totalScoreEl.textContent = breakdown.total.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    // Render charts and insights
    renderBreakdownChart(breakdown)
    renderBenchmarkChart(breakdown.total)

    const insights = getPersonalizedInsights(breakdown, data)
    renderInsights(insights)

    // Show results section and move focus for accessibility
    resultsSection.style.display = 'block'
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => resultsSection.focus(), 500)
  })
})
