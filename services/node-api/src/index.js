// cat > services/node-api/src/index.js <<'EOF'
import express from 'express';
import pino from 'pino';
import { CFG } from './config.js';
import { initKafka, kafkaReady, producer } from './kafka.js';
import { startWorker, stopWorker } from './worker.js';

const app = express();
const log = pino();
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', async (_req, res) => {
  try { await kafkaReady(); res.status(200).json({ ready: true }); }
  catch { res.status(503).json({ ready: false }); }
});

app.post('/enqueue', async (req, res) => {
  const payload = Object.keys(req.body || {}).length ? req.body : { t: Date.now() };
  const key = Buffer.from(JSON.stringify(payload)).toString('base64'); // deterministic key (simple)
  await producer.send({
    topic: CFG.TOPIC_MAIN,
    messages: [{ key, value: JSON.stringify(payload) }]
  });
  log.info({ key }, 'enqueued');
  res.json({ enqueued: true, key });
});

const server = app.listen(CFG.PORT, async () => {
  log.info({ port: CFG.PORT }, 'node-api up');
  try { await initKafka(); await startWorker(); }
  catch (err) { log.error({ err: err.message }, 'startup failed'); process.exit(1); }
});

// graceful shutdown
const shutdown = async () => {
  log.warn('shutdown');
  server.close(async () => {
    await stopWorker();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// EOF
