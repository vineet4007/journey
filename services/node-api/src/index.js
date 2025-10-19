import express from 'express';
import pino from 'pino';

const app = express();
const log = pino();

app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ service: 'node-api', ok: true }));

const server = app.listen(process.env.PORT || 3000, () => {
  log.info({ port: server.address().port }, 'node-api up');
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
