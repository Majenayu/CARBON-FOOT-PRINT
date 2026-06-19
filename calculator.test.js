/**
 * @file calculator.test.js
 * @description Comprehensive unit tests for the EcoTrack carbon footprint calculator.
 * Tests cover all emission categories, edge cases, boundary conditions, and helpers.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateFootprint,
  getPersonalizedInsights,
  getBenchmarkComparison,
  EMISSION_FACTORS,
  GLOBAL_AVG_KG,
  PARIS_TARGET_KG
} from './calculator'

// ─── calculateFootprint ───────────────────────────────────────────────────────

describe('calculateFootprint', () => {
  it('returns a zero-total breakdown for null input', () => {
    const result = calculateFootprint(null)
    expect(result.total).toBe(0)
    expect(result.transport).toBe(0)
    expect(result.energy).toBe(0)
  })

  it('returns a zero-total breakdown for non-object input', () => {
    expect(calculateFootprint(42).total).toBe(0)
    expect(calculateFootprint('string').total).toBe(0)
    expect(calculateFootprint(undefined).total).toBe(0)
  })

  it('calculates correct annual footprint for standard car/electricity/meat inputs', () => {
    const data = {
      transportType: 'car', transportDistance: 50,
      energyType: 'electricity', energyUsage: 100,
      dietType: 'meat',
      wasteType: 'landfill', weeklyWaste: 0,
      lifestyleLevel: 'average'
    }
    // transport: 50 * 0.17 * 52 = 442
    // energy:    100 * 0.45 * 52 = 2340
    // diet:      3.3 * 365 = 1204.5
    // waste:     0
    // lifestyle: 1000
    const result = calculateFootprint(data)
    expect(result.transport).toBe(442)
    expect(result.energy).toBe(2340)
    expect(result.diet).toBe(1204.5)
    expect(result.waste).toBe(0)
    expect(result.lifestyle).toBe(1000)
    expect(result.total).toBe(parseFloat((442 + 2340 + 1204.5 + 0 + 1000).toFixed(2)))
  })

  it('handles zero kilometre input (bicycle) giving zero transport emissions', () => {
    const data = {
      transportType: 'bicycle', transportDistance: 0,
      energyType: 'solar', energyUsage: 0,
      dietType: 'vegan',
      wasteType: 'composting', weeklyWaste: 0,
      lifestyleLevel: 'minimal'
    }
    const result = calculateFootprint(data)
    expect(result.transport).toBe(0)
    expect(result.energy).toBe(0)
    expect(result.diet).toBe(parseFloat((EMISSION_FACTORS.diet.vegan * 365).toFixed(2)))
    expect(result.waste).toBe(0)
    expect(result.lifestyle).toBe(400)
  })

  it('calculates waste emissions correctly for landfill', () => {
    const data = {
      transportType: 'bicycle', transportDistance: 0,
      energyType: 'solar', energyUsage: 0,
      dietType: 'vegan',
      wasteType: 'landfill', weeklyWaste: 10,
      lifestyleLevel: 'minimal'
    }
    const result = calculateFootprint(data)
    // waste: 10 * 0.52 * 52 = 270.4
    expect(result.waste).toBe(270.4)
  })

  it('composting produces near-zero waste emissions', () => {
    const data = {
      transportType: 'bicycle', transportDistance: 0,
      energyType: 'solar', energyUsage: 0,
      dietType: 'vegan',
      wasteType: 'composting', weeklyWaste: 10,
      lifestyleLevel: 'minimal'
    }
    const result = calculateFootprint(data)
    // waste: 10 * 0.01 * 52 = 5.2
    expect(result.waste).toBe(5.2)
  })

  it('highConsumer lifestyle adds 2000 kg, minimal adds 400', () => {
    const base = { transportType: 'bicycle', transportDistance: 0, energyType: 'solar', energyUsage: 0, dietType: 'vegan', wasteType: 'composting', weeklyWaste: 0 }
    expect(calculateFootprint({ ...base, lifestyleLevel: 'highConsumer' }).lifestyle).toBe(2000)
    expect(calculateFootprint({ ...base, lifestyleLevel: 'minimal' }).lifestyle).toBe(400)
    expect(calculateFootprint({ ...base, lifestyleLevel: 'average' }).lifestyle).toBe(1000)
  })

  it('handles unknown emission type keys gracefully (defaults to 0)', () => {
    const data = {
      transportType: 'hovercraft', transportDistance: 100,
      energyType: 'magic', energyUsage: 100,
      dietType: 'unknown',
      wasteType: 'flying', weeklyWaste: 10,
      lifestyleLevel: 'unknown'
    }
    const result = calculateFootprint(data)
    expect(result.transport).toBe(0)
    expect(result.energy).toBe(0)
    expect(result.diet).toBe(0)
    expect(result.waste).toBe(0)
    expect(result.lifestyle).toBe(0)
    expect(result.total).toBe(0)
  })

  it('correctly calculates for EV with solar energy – very low footprint', () => {
    const data = {
      transportType: 'ev', transportDistance: 100,
      energyType: 'solar', energyUsage: 50,
      dietType: 'vegan',
      wasteType: 'composting', weeklyWaste: 5,
      lifestyleLevel: 'minimal'
    }
    const result = calculateFootprint(data)
    expect(result.total).toBeLessThan(PARIS_TARGET_KG)
  })
})

// ─── getPersonalizedInsights ──────────────────────────────────────────────────

describe('getPersonalizedInsights', () => {
  it('returns High-impact transport insight for car user', () => {
    const breakdown = { transport: 442, energy: 2340, diet: 1204, waste: 0, lifestyle: 1000, total: 4986 }
    const data = { transportType: 'car', energyType: 'electricity', dietType: 'meat', wasteType: 'recycling', weeklyWaste: 5, lifestyleLevel: 'average' }
    const insights = getPersonalizedInsights(breakdown, data)
    expect(insights.some(i => i.id === 'transport-ev')).toBe(true)
  })

  it('returns High-impact diet insight for meat eater', () => {
    const breakdown = { transport: 0, energy: 0, diet: 1204, waste: 0, lifestyle: 0, total: 1204 }
    const data = { transportType: 'bicycle', energyType: 'solar', dietType: 'meat', wasteType: 'recycling', weeklyWaste: 0, lifestyleLevel: 'minimal' }
    const insights = getPersonalizedInsights(breakdown, data)
    expect(insights.some(i => i.id === 'diet-plant')).toBe(true)
    expect(insights.every(i => i.impact === 'High' || i.impact === 'Medium' || i.impact === 'Low')).toBe(true)
  })

  it('returns energy insight for electricity user', () => {
    const breakdown = { transport: 0, energy: 2340, diet: 547.5, waste: 0, lifestyle: 400, total: 3287.5 }
    const data = { transportType: 'bicycle', energyType: 'electricity', dietType: 'vegan', wasteType: 'composting', weeklyWaste: 0, lifestyleLevel: 'minimal' }
    const insights = getPersonalizedInsights(breakdown, data)
    expect(insights.some(i => i.id === 'energy-solar')).toBe(true)
  })

  it('returns lifestyle insight for high consumer', () => {
    const breakdown = { transport: 0, energy: 0, diet: 547.5, waste: 0, lifestyle: 2000, total: 2547.5 }
    const data = { transportType: 'bicycle', energyType: 'solar', dietType: 'vegan', wasteType: 'composting', weeklyWaste: 0, lifestyleLevel: 'highConsumer' }
    const insights = getPersonalizedInsights(breakdown, data)
    expect(insights.some(i => i.id === 'lifestyle-minimal')).toBe(true)
  })

  it('returns general/encouragement insight if no specific triggers', () => {
    const breakdown = { transport: 260, energy: 52, diet: 547.5, waste: 0, lifestyle: 400, total: 1259.5 }
    const data = { transportType: 'ev', energyType: 'solar', dietType: 'vegan', wasteType: 'composting', weeklyWaste: 0, lifestyleLevel: 'minimal' }
    const insights = getPersonalizedInsights(breakdown, data)
    expect(insights.some(i => i.id === 'general-leader')).toBe(true)
  })

  it('returns insights sorted by impact (High before Medium before Low)', () => {
    const breakdown = { transport: 442, energy: 2340, diet: 1204, waste: 270, lifestyle: 2000, total: 6256 }
    const data = { transportType: 'car', energyType: 'electricity', dietType: 'meat', wasteType: 'landfill', weeklyWaste: 10, lifestyleLevel: 'highConsumer' }
    const insights = getPersonalizedInsights(breakdown, data)
    const impactOrder = { High: 0, Medium: 1, Low: 2 }
    for (let i = 1; i < insights.length; i++) {
      expect(impactOrder[insights[i].impact]).toBeGreaterThanOrEqual(impactOrder[insights[i - 1].impact])
    }
  })

  it('each insight has required properties (id, text, saving, impact, category, icon)', () => {
    const breakdown = { transport: 442, energy: 2340, diet: 1204, waste: 0, lifestyle: 1000, total: 4986 }
    const data = { transportType: 'car', energyType: 'electricity', dietType: 'meat', wasteType: 'recycling', weeklyWaste: 0, lifestyleLevel: 'average' }
    const insights = getPersonalizedInsights(breakdown, data)
    insights.forEach(insight => {
      expect(insight).toHaveProperty('id')
      expect(insight).toHaveProperty('text')
      expect(insight).toHaveProperty('saving')
      expect(insight).toHaveProperty('impact')
      expect(insight).toHaveProperty('category')
      expect(insight).toHaveProperty('icon')
    })
  })
})

// ─── getBenchmarkComparison ───────────────────────────────────────────────────

describe('getBenchmarkComparison', () => {
  it('returns "excellent" status for footprint below Paris target', () => {
    const result = getBenchmarkComparison(1500)
    expect(result.status).toBe('excellent')
  })

  it('returns "good" status for footprint between Paris target and global average', () => {
    const result = getBenchmarkComparison(3500)
    expect(result.status).toBe('good')
  })

  it('returns "average" status for footprint just above global average', () => {
    const result = getBenchmarkComparison(5500)
    expect(result.status).toBe('average')
  })

  it('returns "critical" status for very high footprint', () => {
    const result = getBenchmarkComparison(9000)
    expect(result.status).toBe('critical')
  })

  it('returns correct percentVsGlobal calculation', () => {
    const result = getBenchmarkComparison(GLOBAL_AVG_KG)
    expect(result.percentVsGlobal).toBe(100)
  })

  it('returns correct percentVsParis calculation', () => {
    const result = getBenchmarkComparison(PARIS_TARGET_KG)
    expect(result.percentVsParis).toBe(100)
  })

  it('safely handles zero input', () => {
    const result = getBenchmarkComparison(0)
    expect(result.status).toBe('excellent')
    expect(result.percentVsGlobal).toBe(0)
  })

  it('safely handles invalid input (non-number)', () => {
    const result = getBenchmarkComparison('bad')
    expect(result.status).toBe('unknown')
    expect(result.percentVsGlobal).toBe(0)
  })

  it('safely handles negative input', () => {
    const result = getBenchmarkComparison(-100)
    expect(result.status).toBe('unknown')
  })
})

// ─── EMISSION_FACTORS Constants ───────────────────────────────────────────────

describe('EMISSION_FACTORS constants', () => {
  it('transport factors are all non-negative numbers', () => {
    Object.values(EMISSION_FACTORS.transport).forEach(v => expect(typeof v).toBe('number') && expect(v).toBeGreaterThanOrEqual(0))
  })

  it('energy factors are all non-negative numbers', () => {
    Object.values(EMISSION_FACTORS.energy).forEach(v => expect(typeof v).toBe('number') && expect(v).toBeGreaterThanOrEqual(0))
  })

  it('diet factors are all positive numbers', () => {
    Object.values(EMISSION_FACTORS.diet).forEach(v => expect(v).toBeGreaterThan(0))
  })

  it('bicycle transport factor is exactly 0', () => {
    expect(EMISSION_FACTORS.transport.bicycle).toBe(0)
  })

  it('solar energy factor is lower than all other energy factors', () => {
    const solarFactor = EMISSION_FACTORS.energy.solar
    const others = Object.entries(EMISSION_FACTORS.energy)
      .filter(([k]) => k !== 'solar')
      .map(([, v]) => v)
    others.forEach(v => expect(solarFactor).toBeLessThan(v))
  })
})
