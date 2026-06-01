/**
 * index.js — Alert Service
 * --------------------------------------------------------------
 * Endpoints:
 *   GET /health
 *   GET /api/alerts            — lista alertas (Cache-Aside via Redis)
 *   GET /api/alerts/duplicates — log de duplicatas (RN3)
 *
 * Roda tambem um consumer de RabbitMQ em background.
 * --------------------------------------------------------------
 */

const express = require('express');
const { startConsumer } = require('./rabbitmq-consumer');
const cache = require('./redis-cache');
const { repo: alertsRepo } = require('./alerts-repository');
const { store: idempotencyStore } = require('./idempotency-store');

const PORT = process.env.PORT || 3002;
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    service: 'alert-service',
    status: 'ok',
    alertsStored: alertsRepo.count(),
    uniqueEventIds: idempotencyStore.size(),
  });
});

/**
 * GET /api/alerts
 * Padrao Cache-Aside:
 *   1. Tenta ler do Redis (cache:alerts:all)
 *   2. Se MISS, le do repo, grava no cache (TTL=30s) e devolve
 *   3. Header X-Cache: HIT|MISS para evidenciar nos testes
 */
app.get('/api/alerts', async (req, res) => {
  const { severity } = req.query;
  const cacheKey = severity ? `alerts:${severity}` : 'alerts:all';

  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json({ cache: 'HIT', count: cached.length, alerts: cached });
    }

    const alerts = alertsRepo.list({ severity });
    await cache.set(cacheKey, alerts, 30); // TTL = 30s
    res.setHeader('X-Cache', 'MISS');
    res.json({ cache: 'MISS', count: alerts.length, alerts });
  } catch (err) {
    console.error('[GET /api/alerts] erro:', err.message);
    // Cache falhou — degrada graciosamente, le direto do repo
    const alerts = alertsRepo.list({ severity });
    res.setHeader('X-Cache', 'BYPASS');
    res.json({ cache: 'BYPASS', count: alerts.length, alerts });
  }
});

app.get('/api/alerts/duplicates', (req, res) => {
  res.json({
    count: idempotencyStore.getDuplicateLog().length,
    duplicates: idempotencyStore.getDuplicateLog(),
  });
});

async function start() {
  await cache.connect();
  await startConsumer();
  app.listen(PORT, () => {
    console.log(`[alert-service] Ouvindo na porta ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
