const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const NASA_BASE_URL = process.env.NASA_BASE_URL || 'https://api.nasa.gov/DONKI';

// Instancia dedicada do axios
const nasaHttp = axios.create({
  baseURL: NASA_BASE_URL,
  timeout: 10_000,
});

// Retry com exponential backoff: 1s, 2s, 4s
axiosRetry(nasaHttp, {
  retries: 3,
  retryDelay: (retryCount) => {
    const delayMs = Math.pow(2, retryCount - 1) * 1000;
    console.log(`[nasa-client] Retry #${retryCount} em ${delayMs}ms`);
    return delayMs;
  },
  retryCondition: (error) => {
    // retry em erros de rede e em status 5xx ou 429 (rate limit)
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 429 ||
      (error.response?.status >= 500 && error.response?.status < 600)
    );
  },
});

/**
 * Busca tempestades geomagneticas (GST) do DONKI.
 * @param {string} startDate ISO date (YYYY-MM-DD)
 * @param {string} endDate   ISO date (YYYY-MM-DD)
 * @returns {Promise<Array>} array de eventos GST
 */
async function fetchGstEvents(startDate, endDate) {
  console.log(`[nasa-client] GET /GST startDate=${startDate} endDate=${endDate}`);
  const response = await nasaHttp.get('/GST', {
    params: {
      startDate,
      endDate,
      api_key: NASA_API_KEY,
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

module.exports = { fetchGstEvents };
