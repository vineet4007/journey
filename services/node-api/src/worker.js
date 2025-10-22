// cat > services/node-api/src/worker.js <<'EOF'
import pino from 'pino';
import crypto from 'node:crypto';
import { consumer, producer } from './kafka.js';
import { CFG } from './config.js';

const log = pino();

function backoffMs(attempt) {
  const base = Math.min(60000, 1000 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

function keyFor(payload) {
  // stable idempotency key: hash the JSON
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

async function processMessage(data) {
  // simulate transient errors first 2 attempts
  const attempt = Number(data._attempt ?? 0);
  if (attempt < 2) throw new Error(`transient failure at attempt ${attempt}`);
  return { ok: true, attempt };
}

export async function startWorker() {
  await consumer.subscribe({ topic: CFG.TOPIC_MAIN, fromBeginning: true });

  await consumer.run({
    // control concurrency if needed: eachBatch/partitionsConsumedConcurrently
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() || '{}';
      let data;
      try { data = JSON.parse(raw); }
      catch {
        await producer.send({ topic: CFG.TOPIC_DLQ, messages: [{ key: message.key?.toString(), value: raw }]});
        return;
      }

      try {
        const result = await processMessage(data);
        log.info({ key: message.key?.toString(), result }, 'completed');
      } catch (err) {
        const nextAttempt = Number(data._attempt ?? 0) + 1;
        if (nextAttempt >= CFG.MAX_ATTEMPTS) {
          const dlqPayload = {
            payload: data,
            error: err.message,
            ts: new Date().toISOString(),
            attempts: nextAttempt
          };
          await producer.send({ topic: CFG.TOPIC_DLQ, messages: [{ key: message.key?.toString(), value: JSON.stringify(dlqPayload) }]});
          log.warn({ key: message.key?.toString() }, 'to DLQ');
          return;
        }
        const delay = backoffMs(nextAttempt);
        setTimeout(async () => {
          await producer.send({
            topic: CFG.TOPIC_MAIN,
            messages: [{ key: message.key?.toString(), value: JSON.stringify({ ...data, _attempt: nextAttempt }) }],
          });
        }, delay);
        log.warn({ key: message.key?.toString(), attempt: nextAttempt, delay }, 'retrying');
      }
    },
  });

  log.info({ topic: CFG.TOPIC_MAIN }, 'worker started');
}

export async function stopWorker() {
  try { await consumer.disconnect(); } catch {}
  try { await producer.disconnect(); } catch {}
}
// EOF
