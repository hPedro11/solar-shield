/**
 * redis-cache.js
 * --------------------------------------------------------------
 * Cliente Redis para o padrao Cache-Aside no endpoint GET /api/alerts.
 *
 * TTL = 30 segundos.
 * Justificativa (vai no README): alertas de clima espacial sao
 * eventos esparsos (intervalos de minutos a horas), entao 30s
 * absorve picos de leitura sem deixar dado obsoleto para operadores
 * de infraestrutura critica.
 * --------------------------------------------------------------
 */

const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
let client = null;

async function connect() {
  client = redis.createClient({ url: REDIS_URL });
  client.on('error', (err) => console.error('[redis] erro:', err.message));
  await client.connect();
  console.log('[redis] Conectado ✓');
}

async function get(key) {
  if (!client?.isOpen) return null;
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

async function set(key, value, ttlSeconds = 30) {
  if (!client?.isOpen) return;
  await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

async function invalidate(key) {
  if (!client?.isOpen) return;
  await client.del(key);
}

module.exports = { connect, get, set, invalidate };
