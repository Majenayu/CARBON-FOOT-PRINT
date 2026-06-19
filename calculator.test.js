import { describe, it, expect } from 'vitest'
import { calculateFootprint, getPersonalizedInsights, EMISSION_FACTORS } from './calculator'

describe('Carbon Footprint Calculator', () => {
  it('should calculate correct annual footprint for standard inputs', () => {
    const data = {
      transportType: 'car',
      transportDistance: 50,
      energyType: 'electricity',
      energyUsage: 100,
      dietType: 'meat'
    }
    
    // (50 * 0.17 * 52) + (100 * 0.45 * 52) + (3.3 * 365) = 442 + 2340 + 1204.5 = 3986.5
    expect(calculateFootprint(data)).toBe(3986.5)
  })

  it('should handle zero inputs correctly', () => {
    const data = {
      transportDistance: 0,
      energyUsage: 0,
      dietType: 'vegan'
    }
    expect(calculateFootprint(data)).toBe(EMISSION_FACTORS.diet.vegan * 365)
  })

  it('should return 0 for missing data', () => {
    expect(calculateFootprint(null)).toBe(0)
  })

  it('should generate structured insights based on user data', () => {
    const data = { transportType: 'car', energyType: 'gas', dietType: 'meat' }
    const insights = getPersonalizedInsights(4000, data)
    
    expect(insights).toHaveLength(3)
    expect(insights[0]).toHaveProperty('category', 'Transport')
    expect(insights[0]).toHaveProperty('impact', 'High')
  })

  it('should provide encouragement for low footprint users', () => {
    const data = { transportType: 'ev', energyType: 'solar', dietType: 'vegan' }
    const insights = getPersonalizedInsights(500, data)
    
    // EV/Solar/Vegan don't trigger specific "reduction" insights in the current logic
    // so it should return the "General" low footprint insight
    expect(insights[0].category).toBe('General')
  })
})
