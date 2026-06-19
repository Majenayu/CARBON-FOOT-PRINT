import './style.css'
import { calculateFootprint, getPersonalizedInsights } from './calculator'
import { getDistanceWithGoogleMaps } from './googleServices'

/**
 * @typedef {Object} AppState
 * @property {Array} history
 * @property {Object|null} lastResult
 */

/** @type {AppState} */
const state = {
  history: JSON.parse(localStorage.getItem('ecoTrackHistory') || '[]'),
  lastResult: null
}

/**
 * Security: Precise Input Sanitization
 * @param {string} str 
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Save state to LocalStorage
 */
function saveState() {
  localStorage.setItem('ecoTrackHistory', JSON.stringify(state.history))
}

/**
 * Renders the history list
 */
function renderHistory() {
  const historyList = document.querySelector('#history-list')
  if (state.history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No calculations yet. Start tracking today!</p>'
    return
  }

  historyList.innerHTML = state.history.map((item, index) => `
    <div class="history-item">
      <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
      <span class="history-score">${item.score.toLocaleString()} kg</span>
    </div>
  `).join('')
}

/**
 * Renders the insights roadmap
 * @param {Array} insights 
 */
function renderInsights(insights) {
  const container = document.querySelector('#insights')
  container.innerHTML = insights.map(insight => `
    <div class="insight-card ${insight.impact.toLowerCase()}">
      <div class="insight-header">
        <span class="category-tag">${sanitize(insight.category)}</span>
        <span class="impact-tag">${sanitize(insight.impact)} Impact</span>
      </div>
      <p>${sanitize(insight.text)}</p>
    </div>
  `).join('')
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#footprint-form')
  const totalScoreDisplay = document.querySelector('#total-score')
  const resultsSection = document.querySelector('#results')
  const estimateBtn = document.querySelector('#estimate-distance-btn')
  const clearHistoryBtn = document.querySelector('#clear-history')

  // Initial Render
  renderHistory()

  // Google Services: Secure Distance Estimation
  estimateBtn.addEventListener('click', async () => {
    const originalText = estimateBtn.textContent
    estimateBtn.textContent = 'Analyzing...'
    estimateBtn.disabled = true
    
    try {
      const distance = await getDistanceWithGoogleMaps('Home', 'Office')
      document.querySelector('#transportDistance').value = distance
    } catch (error) {
      console.error('Service error:', error)
      alert('Could not retrieve distance. Please enter manually.')
    } finally {
      estimateBtn.textContent = originalText
      estimateBtn.disabled = false
    }
  })

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all tracking history?')) {
      state.history = []
      saveState()
      renderHistory()
    }
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()

    const formData = new FormData(form)
    const data = {
      transportType: sanitize(formData.get('transportType') || 'car'),
      transportDistance: parseFloat(formData.get('transportDistance')) || 0,
      energyType: sanitize(formData.get('energyType') || 'electricity'),
      energyUsage: parseFloat(formData.get('energyUsage')) || 0,
      dietType: sanitize(formData.get('dietType') || 'meat')
    }

    const totalFootprint = calculateFootprint(data)
    
    // Update State
    state.lastResult = totalFootprint
    state.history.unshift({
      date: new Date().toISOString(),
      score: totalFootprint,
      data: data
    })
    
    // Limit history to 10 items
    if (state.history.length > 10) state.history.pop()

    // Persist & Render
    saveState()
    renderHistory()
    
    totalScoreDisplay.textContent = totalFootprint.toLocaleString(undefined, { minimumFractionDigits: 2 })
    
    const insights = getPersonalizedInsights(totalFootprint, data)
    renderInsights(insights)

    resultsSection.style.display = 'block'
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  })
})


