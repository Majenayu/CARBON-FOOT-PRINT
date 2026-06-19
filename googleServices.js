/**
 * @module googleServices
 * @description Google Services Integration Module
 * Provides a robust, structured interface for Google Maps & Environmental APIs.
 * Production-ready architecture with error boundaries, retry logic, and input validation.
 */

/** Maximum allowed retries for transient network failures */
const MAX_RETRIES = 3
const REQUEST_TIMEOUT_MS = 5000

/**
 * Validates that origin and destination are non-empty strings.
 * @param {string} origin
 * @param {string} destination
 * @throws {TypeError} If inputs are invalid
 */
function validateLocationInputs(origin, destination) {
  if (typeof origin !== 'string' || origin.trim().length === 0) {
    throw new TypeError('Origin must be a non-empty string.')
  }
  if (typeof destination !== 'string' || destination.trim().length === 0) {
    throw new TypeError('Destination must be a non-empty string.')
  }
}

/**
 * Simulates a resilient Google Maps Distance Matrix API call with
 * retry logic, timeout handling, and structured error responses.
 *
 * In production, replace the mock implementation with:
 *   const service = new google.maps.DistanceMatrixService();
 *   service.getDistanceMatrix({ origins: [origin], destinations: [destination], ... })
 *
 * @param {string} origin       - Starting location label
 * @param {string} destination  - Ending location label
 * @param {number} [retries=0]  - Internal retry counter
 * @returns {Promise<number>} Distance in km
 * @throws {Error} On invalid input or service failure after all retries
 */
export async function getDistanceWithGoogleMaps(origin, destination, retries = 0) {
  validateLocationInputs(origin, destination)

  const safeOrigin = origin.trim()
  const safeDestination = destination.trim()

  try {
    // Simulate async API call with a realistic timeout guard
    const distance = await Promise.race([
      _fetchDistanceMock(safeOrigin, safeDestination),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), REQUEST_TIMEOUT_MS)
      )
    ])
    return distance
  } catch (error) {
    if (retries < MAX_RETRIES) {
      // Exponential back-off: 200ms, 400ms, 800ms
      await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)))
      return getDistanceWithGoogleMaps(safeOrigin, safeDestination, retries + 1)
    }
    throw new Error(`Distance service failed after ${MAX_RETRIES} retries: ${error.message}`)
  }
}

/**
 * Internal mock that simulates the Google Maps Distance Matrix API.
 * Returns a deterministic-ish distance based on input hash for testability.
 * @private
 */
async function _fetchDistanceMock(origin, destination) {
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300))
  // Seed based on string length for repeatable demo values
  const seed = (origin.length * 7 + destination.length * 13) % 90
  return seed + 10 // Range: 10–99 km
}

/**
 * Fetches representative industry-average carbon impact data from a
 * Google-like environmental data service (mocked).
 *
 * @param {string} category - One of 'transport' | 'energy' | 'diet' | 'waste'
 * @returns {Promise<{category: string, globalAvgKg: number, parisTargetKg: number}>}
 * @throws {Error} If an unsupported category is requested
 */
export async function fetchGoogleCarbonImpact(category) {
  const SUPPORTED_CATEGORIES = ['transport', 'energy', 'diet', 'waste']
  if (!SUPPORTED_CATEGORIES.includes(category)) {
    throw new Error(`Unsupported category "${category}". Valid options: ${SUPPORTED_CATEGORIES.join(', ')}`)
  }

  // Mocking a structured JSON response from Google's Environmental Insights Explorer
  const mockData = {
    transport: { category: 'transport', globalAvgKg: 1500, parisTargetKg: 600 },
    energy:    { category: 'energy',    globalAvgKg: 2000, parisTargetKg: 700 },
    diet:      { category: 'diet',      globalAvgKg: 1200, parisTargetKg: 550 },
    waste:     { category: 'waste',     globalAvgKg: 400,  parisTargetKg: 100 }
  }

  await new Promise(resolve => setTimeout(resolve, 150))
  return mockData[category]
}
