/**
 * @module calculator
 * @description Carbon Footprint Calculation Logic
 * Emission factors are based on EPA, UK Government GHG Conversion Factors
 * and IPCC AR6 global average data (kg CO2e per unit)
 */

/**
 * @readonly
 * @enum {Object}
 */
export const EMISSION_FACTORS = {
  transport: {
    car: 0.17,        // Average ICE car (petrol/diesel) per km
    ev: 0.05,         // Electric vehicle (grid-average electricity) per km
    bus: 0.10,        // Public bus per km
    train: 0.04,      // Train / Metro per km
    flight: 0.25,     // Domestic air travel per km
    motorcycle: 0.11, // Motorcycle/scooter per km
    bicycle: 0.00     // Cycling – zero direct emissions
  },
  energy: {
    electricity: 0.45, // kg CO2e per kWh (global grid average)
    gas: 0.18,         // Natural gas per kWh
    solar: 0.02,       // Solar/renewable (lifecycle) per kWh
    oil: 0.27          // Heating oil per kWh
  },
  diet: {
    meat: 3.3,         // High-meat diet – daily kg CO2e
    pescatarian: 2.4,  // Fish-based diet
    vegetarian: 1.7,   // Vegetarian diet
    vegan: 1.5         // Fully plant-based diet
  },
  waste: {
    landfill: 0.52,    // kg CO2e per kg of landfill waste
    recycling: 0.02,   // kg CO2e per kg of recycled waste
    composting: 0.01   // kg CO2e per kg of composted waste
  },
  lifestyle: {
    highConsumer: 2000, // Annual kg CO2e from high consumption (flights, gadgets, clothing)
    average: 1000,      // Moderate consumer
    minimal: 400        // Minimal consumer
  }
}

/** Global average annual carbon footprint in kg CO2e (World Bank 2023) */
export const GLOBAL_AVG_KG = 4800

/** Target sustainable footprint per the Paris Agreement */
export const PARIS_TARGET_KG = 2300

/**
 * Calculates total annual carbon footprint from all lifecycle sources.
 * All inputs are zero-safe; missing keys default to zero.
 * @param {Object} data - Validated user input object
 * @param {string}  data.transportType
 * @param {number}  data.transportDistance  - Weekly km
 * @param {string}  data.energyType
 * @param {number}  data.energyUsage        - Weekly kWh
 * @param {string}  data.dietType
 * @param {string}  [data.wasteType]
 * @param {number}  [data.weeklyWaste]      - Weekly kg of waste
 * @param {string}  [data.lifestyleLevel]
 * @returns {Object} Breakdown object + total
 */
export function calculateFootprint(data) {
  if (!data || typeof data !== 'object') {
    return { transport: 0, energy: 0, diet: 0, waste: 0, lifestyle: 0, total: 0 }
  }

  const transport = parseFloat(
    ((Number(data.transportDistance) || 0) *
      (EMISSION_FACTORS.transport[data.transportType] || 0) * 52).toFixed(2)
  )

  const energy = parseFloat(
    ((Number(data.energyUsage) || 0) *
      (EMISSION_FACTORS.energy[data.energyType] || 0) * 52).toFixed(2)
  )

  const diet = parseFloat(
    ((EMISSION_FACTORS.diet[data.dietType] || 0) * 365).toFixed(2)
  )

  const waste = parseFloat(
    ((Number(data.weeklyWaste) || 0) *
      (EMISSION_FACTORS.waste[data.wasteType] || 0) * 52).toFixed(2)
  )

  const lifestyle = EMISSION_FACTORS.lifestyle[data.lifestyleLevel] || 0

  const total = parseFloat((transport + energy + diet + waste + lifestyle).toFixed(2))

  return { transport, energy, diet, waste, lifestyle, total }
}

/**
 * Generates a structured, prioritised 4-step Reduction Roadmap.
 * Insights are sorted by CO2 saving potential (highest first).
 * @param {Object} breakdown - Result from calculateFootprint
 * @param {Object} data      - Original user input data
 * @returns {Array<{id: string, text: string, saving: string, impact: string, category: string, icon: string}>}
 */
export function getPersonalizedInsights(breakdown, data) {
  const insights = []

  if (data.transportType === 'car' || data.transportType === 'flight' || data.transportType === 'motorcycle') {
    const potentialSaving = Math.round(breakdown.transport * 0.6)
    insights.push({
      id: 'transport-ev',
      text: `Switching to an EV or public transit could eliminate up to 60% of your transport emissions, saving ~${potentialSaving.toLocaleString()} kg CO2 per year.`,
      saving: `~${potentialSaving.toLocaleString()} kg CO2/yr`,
      impact: 'High',
      category: 'Transport',
      icon: '🚌'
    })
  }

  if (data.energyType === 'gas' || data.energyType === 'oil' || data.energyType === 'electricity') {
    const potentialSaving = Math.round(breakdown.energy * 0.85)
    insights.push({
      id: 'energy-solar',
      text: `Switching to solar or a 100% renewable tariff could cut your home energy footprint by up to 85%, saving ~${potentialSaving.toLocaleString()} kg CO2 per year.`,
      saving: `~${potentialSaving.toLocaleString()} kg CO2/yr`,
      impact: 'Medium',
      category: 'Energy',
      icon: '☀️'
    })
  }

  if (data.dietType === 'meat' || data.dietType === 'pescatarian') {
    const potentialSaving = Math.round((breakdown.diet - (EMISSION_FACTORS.diet.vegan * 365)) * 0.7)
    insights.push({
      id: 'diet-plant',
      text: `Adopting a plant-based diet 4 days a week reduces food-related emissions by up to 40%, saving ~${Math.max(0, potentialSaving).toLocaleString()} kg CO2 per year.`,
      saving: `~${Math.max(0, potentialSaving).toLocaleString()} kg CO2/yr`,
      impact: 'High',
      category: 'Diet',
      icon: '🥦'
    })
  }

  if (data.wasteType === 'landfill' && (Number(data.weeklyWaste) || 0) > 0) {
    const potentialSaving = Math.round(breakdown.waste * 0.9)
    insights.push({
      id: 'waste-compost',
      text: `Switching from landfill to composting and recycling could reduce your waste emissions by 90%.`,
      saving: `~${potentialSaving.toLocaleString()} kg CO2/yr`,
      impact: 'Medium',
      category: 'Waste',
      icon: '♻️'
    })
  }

  // Lifestyle insight
  if (data.lifestyleLevel === 'highConsumer') {
    insights.push({
      id: 'lifestyle-minimal',
      text: 'Reducing discretionary purchases (gadgets, fast fashion, frequent flights) can cut your lifestyle footprint by 70% or more.',
      saving: '~1,120 kg CO2/yr',
      impact: 'Medium',
      category: 'Lifestyle',
      icon: '🛒'
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'general-leader',
      text: 'Your footprint is well below the global average! Share your journey to inspire others and consider carbon offset projects.',
      saving: 'Already low',
      impact: 'Low',
      category: 'General',
      icon: '🌍'
    })
  }

  // Sort by impact: High > Medium > Low
  const impactOrder = { High: 0, Medium: 1, Low: 2 }
  return insights.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
}

/**
 * Returns a benchmark comparison object for the user's total vs global/Paris averages.
 * @param {number} totalFootprint - User total in kg CO2e
 * @returns {{ percentVsGlobal: number, percentVsParis: number, status: string }}
 */
export function getBenchmarkComparison(totalFootprint) {
  if (typeof totalFootprint !== 'number' || totalFootprint < 0) {
    return { percentVsGlobal: 0, percentVsParis: 0, status: 'unknown' }
  }
  const percentVsGlobal = Math.round((totalFootprint / GLOBAL_AVG_KG) * 100)
  const percentVsParis = Math.round((totalFootprint / PARIS_TARGET_KG) * 100)
  let status = 'critical'
  if (totalFootprint <= PARIS_TARGET_KG) status = 'excellent'
  else if (totalFootprint <= GLOBAL_AVG_KG) status = 'good'
  else if (totalFootprint <= GLOBAL_AVG_KG * 1.5) status = 'average'
  return { percentVsGlobal, percentVsParis, status }
}
