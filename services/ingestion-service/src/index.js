const express = require('express');
const { fetchGstEvents } = require('./nasa-client');
const { buildAlertFromGstEvent } = require('./classifier');
const { connectWithRetry, publishAlert } = require('./rabbitmq-producer');

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ service: 'ingestion-service', status: 'ok' });
});

app.post('/api/ingest/gst', async (req, res) => {
  try {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);

    const startDate = req.body?.startDate || past.toISOString().slice(0, 10);
    const endDate = req.body?.endDate || today.toISOString().slice(0, 10);

    const events = await fetchGstEvents(startDate, endDate);
    console.log(`[ingest] NASA retornou ${events.length} eventos GST`);

    let published = 0;
    const alerts = [];
    for (const event of events) {
      const alert = buildAlertFromGstEvent(event);
      await publishAlert(alert);
      alerts.push(alert);
      published++;
    }

    res.json({
      ok: true,
      window: { startDate, endDate },
      received: events.length,
      published,
      preview: alerts.slice(0, 3),
    });
  } catch (err) {
    console.error('[ingest] Erro:', err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      hint: 'Verifique a NASA_API_KEY (DEMO_KEY tem limite de 30 req/h)',
    });
  }
});

async function start() {
  await connectWithRetry();
  app.listen(PORT, () => {
    console.log(`[ingestion-service] Ouvindo na porta ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
