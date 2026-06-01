/**
 * rabbitmq-consumer.js
 * --------------------------------------------------------------
 * Consome a fila "space.alerts", aplica RN3 (idempotencia)
 * e armazena os alertas novos no repositorio.
 * --------------------------------------------------------------
 */

const amqp = require('amqplib');
const { store: idempotencyStore } = require('./idempotency-store');
const { repo: alertsRepo } = require('./alerts-repository');
const cache = require('./redis-cache');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://solar:shield@rabbitmq:5672';
const QUEUE_NAME = 'space.alerts';

async function startConsumer(maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[consumer] Conectando ao RabbitMQ (tentativa ${attempt})...`);
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.prefetch(10);

      console.log('[consumer] Aguardando mensagens em', QUEUE_NAME);

      channel.consume(QUEUE_NAME, async (msg) => {
        if (!msg) return;
        try {
          const alert = JSON.parse(msg.content.toString());

          // ---- RN3: idempotencia por event_id ----
          const isNew = idempotencyStore.registerIfNew(alert.event_id);
          if (!isNew) {
            // Duplicata — apenas ack para tirar da fila, ja foi logado
            channel.ack(msg);
            return;
          }

          alertsRepo.save(alert);
          // Invalida cache do GET /api/alerts (proximo GET refresca)
          await cache.invalidate('alerts:all');
          console.log(`[consumer] Alerta salvo: ${alert.event_id} (${alert.severity})`);
          channel.ack(msg);
        } catch (err) {
          console.error('[consumer] Erro ao processar msg:', err.message);
          channel.nack(msg, false, false); // descarta msg malformada
        }
      });

      connection.on('close', () => {
        console.warn('[consumer] Conexao fechada — reconectando em 5s');
        setTimeout(() => startConsumer(), 5000);
      });
      return;
    } catch (err) {
      console.error(`[consumer] Falha: ${err.message}`);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

module.exports = { startConsumer };
