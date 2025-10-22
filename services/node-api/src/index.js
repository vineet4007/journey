
import express from 'express';
import pino from 'pino';
import { initKafka, producer } from './kafka.js';
import { startWorker } from './worker.js';

const app = express();
const log = pino();
app.use(express.json());

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.post('/enqueue', async (req, res) => {
  try {
    const payload = Object.keys(req.body || {}).length ? req.body : { t: Date.now() };
    await producer.send({
      topic: process.env.TOPIC_MAIN || 'jobs',
      messages: [{ key: String(payload.t || Date.now()), value: JSON.stringify(payload) }],
    });
    log.info({ payload }, 'enqueued');
    res.json({ enqueued: true });
  } catch (err) {
    log.error({ err: err.message }, 'enqueue failed');
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  log.info({ port }, 'node-api up');
  try {
    await initKafka();
    await startWorker();
  } catch (err) {
    log.error({ err: err.message }, 'startup failed');
    process.exit(1);
  }
});

