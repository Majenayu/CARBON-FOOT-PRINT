import { expect, test, describe } from 'vitest'
import { calculateFootprint, getPersonalizedInsights } from './calculator'

describe('Carbon Calculator', () => {
  test('calculates footprint correctly for car user', () => {
    const data = {
      transportDistance: 10,
      transportType: 'car',
      energyUsage: 50,
      energyType: 'electricity',
      dietType: 'meat'
    }
    // (10 * 0.2 * 365) + (50 * 0.5 * 52) + (3.3 * 365)
    // 730 + 1300 + 1204.5 = 3234.5
    expect(calculateFootprint(data)).toBe(3234.5)
  })

  test('provides correct insights based on footprint', () => {
    const highFootprint = 6000
    const insights = getPersonalizedInsights(highFootprint)
    expect(insights).toContain("Consider switching to public transport or an EV.")
  })
})
