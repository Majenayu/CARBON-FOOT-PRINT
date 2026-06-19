/**
 * Carbon Footprint Calculation Logic
 * Factors are based on global averages (kg CO2e)
 */

export const EMISSION_FACTORS = {
  transport: {
    car: 0.17, // Average car
    bus: 0.10,
    train: 0.04,
    flight: 0.25,
    ev: 0.05
  },
  energy: {
    electricity: 0.45, // kg CO2e per kWh (global average)
    gas: 0.18,
    solar: 0.02
  },
  diet: {
    meat: 3.3, // Daily impact
    vegetarian: 1.7,
    vegan: 1.5,
    pescatarian: 2.4
  }
}

/**
 * Calculates total annual carbon footprint
 * @param {Object} data - User input data
 * @returns {number} - Total kg CO2 per year
 */
export function calculateFootprint(data) {
  if (!data) return 0
  
  const transportCO2 = (Number(data.transportDistance) || 0) * (EMISSION_FACTORS.transport[data.transportType] || 0) * 52
  const energyCO2 = (Number(data.energyUsage) || 0) * (EMISSION_FACTORS.energy[data.energyType] || 0) * 52
  const dietCO2 = (EMISSION_FACTORS.diet[data.dietType] || 0) * 365

  return parseFloat((transportCO2 + energyCO2 + dietCO2).toFixed(2))
}

/**
 * Generates structured, actionable insights
 * @param {number} totalFootprint 
 * @param {Object} data 
 * @returns {Array<{text: string, impact: string, category: string}>}
 */
export function getPersonalizedInsights(totalFootprint, data) {
  const insights = []

  if (data.transportType === 'car') {
    insights.push({
      text: "Switching to an EV or Public Transport could reduce your transport emissions by up to 70%.",
      impact: "High",
      category: "Transport"
    })
  }

  if (data.energyType === 'gas' || data.energyType === 'electricity') {
    insights.push({
      text: "Installing solar panels can offset your home energy footprint almost entirely.",
      impact: "Medium",
      category: "Energy"
    })
  }

  if (data.dietType === 'meat') {
    insights.push({
      text: "Adopting a plant-based diet even 3 days a week can cut your food-related emissions by 40%.",
      impact: "High",
      category: "Diet"
    })
  }

  if (insights.length === 0) {
    insights.push({
      text: "Your footprint is well below average! Share your journey to inspire others.",
      impact: "Low",
      category: "General"
    })
  }

  return insights
}
