/**
 * Carbon Footprint Calculation Logic
 * Factors are representative and should be updated with latest industry standards.
 */

export const EMISSION_FACTORS = {
  transport: {
    car: 0.2, // kg CO2 per km
    bus: 0.1,
    train: 0.05,
    flight: 0.25
  },
  energy: {
    electricity: 0.5, // kg CO2 per kWh
    gas: 0.2 // kg CO2 per kWh
  },
  diet: {
    meat: 3.3, // kg CO2 per day
    vegetarian: 1.7,
    vegan: 1.5
  }
}

/**
 * Calculates total carbon footprint in kg CO2 per year
 * @param {Object} data 
 * @returns {number}
 */
export function calculateFootprint(data) {
  const transportCO2 = (data.transportDistance || 0) * (EMISSION_FACTORS.transport[data.transportType] || 0) * 365
  const energyCO2 = (data.energyUsage || 0) * (EMISSION_FACTORS.energy[data.energyType] || 0) * 52
  const dietCO2 = (EMISSION_FACTORS.diet[data.dietType] || 0) * 365

  return parseFloat((transportCO2 + energyCO2 + dietCO2).toFixed(2))
}

export function getPersonalizedInsights(totalFootprint) {
  if (totalFootprint > 5000) {
    return [
      "Consider switching to public transport or an EV.",
      "Reduce meat consumption to lower your diet impact.",
      "Switch to renewable energy providers."
    ]
  } else if (totalFootprint > 2000) {
    return [
      "Great start! Try to minimize long-distance flights.",
      "Opt for energy-efficient appliances."
    ]
  } else {
    return [
      "Excellent! You have a very low carbon footprint.",
      "Keep up the sustainable lifestyle and inspire others."
    ]
  }
}
