import './style.css'
import { calculateFootprint, getPersonalizedInsights } from './calculator'
import { getDistanceWithGoogleMaps } from './googleServices'

/**
 * Security: Simple Input Sanitization
 */
function sanitize(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#footprint-form')
  const resultsSection = document.querySelector('#results')
  const totalScoreDisplay = document.querySelector('#total-score')
  const insightsContainer = document.querySelector('#insights')
  const estimateBtn = document.querySelector('#estimate-distance-btn')
  const distanceInput = document.querySelector('#transportDistance')

  // Data Persistence: Load saved data
  const savedData = JSON.parse(localStorage.getItem('ecoTrackData') || '{}')
  if (savedData.transportDistance) {
    document.querySelector('#transportType').value = savedData.transportType
    distanceInput.value = savedData.transportDistance
    document.querySelector('#energyType').value = savedData.energyType
    document.querySelector('#energyUsage').value = savedData.energyUsage
    document.querySelector('#dietType').value = savedData.dietType
  }

  // Google Services: Distance Estimation
  estimateBtn.addEventListener('click', async () => {
    estimateBtn.textContent = 'Calculating...'
    estimateBtn.disabled = true
    
    try {
      // Mocking origin/destination for demo
      const distance = await getDistanceWithGoogleMaps('Current Location', 'Workplace')
      distanceInput.value = distance
      alert(`Google Maps estimated your weekly commute at ${distance} km`)
    } catch (error) {
      console.error('Google Services error:', error)
    } finally {
      estimateBtn.textContent = 'Estimate via Google Maps'
      estimateBtn.disabled = false
    }
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()

    const data = {
      transportType: sanitize(document.querySelector('#transportType').value),
      transportDistance: parseFloat(distanceInput.value) || 0,
      energyType: sanitize(document.querySelector('#energyType').value),
      energyUsage: parseFloat(document.querySelector('#energyUsage').value) || 0,
      dietType: sanitize(document.querySelector('#dietType').value)
    }

    // Persist data
    localStorage.setItem('ecoTrackData', JSON.stringify(data))

    const totalFootprint = calculateFootprint(data)

    totalScoreDisplay.textContent = totalFootprint.toLocaleString(undefined, { minimumFractionDigits: 2 })
    
    const insights = getPersonalizedInsights(totalFootprint)
    insightsContainer.innerHTML = insights.map(insight => `
      <div class="insight-card">
        <p>${sanitize(insight)}</p>
      </div>
    `).join('')

    resultsSection.style.display = 'block'
    resultsSection.scrollIntoView({ behavior: 'smooth' })
  })
})


