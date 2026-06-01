const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://solar:shield@rabbitmq:5672';
const QUEUE_NAME = 'space.alerts';

let channel = null;
let connection = null;

async function connectWithRetry(maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[producer] Conectando ao RabbitMQ (tentativa ${attempt})...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      connection.on('error', (err) => {
        console.error('[producer] Erro de conexao:', err.message);
        channel = null;
      });
      connection.on('close', () => {
        console.warn('[producer] Conexao fechada — reconectando em 5s');
        channel = null;
        setTimeout(() => connectWithRetry(), 5000);
      });

      console.log('[producer] Conectado ao RabbitMQ ✓');
      return;
    } catch (err) {
      console.error(`[producer] Falha na conexao: ${err.message}`);
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function publishAlert(alert) {
  if (!channel) {
    throw new Error('RabbitMQ channel nao disponivel');
  }
  const payload = Buffer.from(JSON.stringify(alert));
  const ok = channel.sendToQueue(QUEUE_NAME, payload, {
    persistent: true,
    contentType: 'application/json',
    messageId: alert.event_id,
  });
  if (!ok) {
    throw new Error('Falha ao publicar mensagem');
  }
  console.log(`[producer] Publicado event_id=${alert.event_id} severity=${alert.severity}`);
}

module.exports = { connectWithRetry, publishAlert, QUEUE_NAME };
