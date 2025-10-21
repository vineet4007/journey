
import pino from 'pino';
import { consumer, producer, TOPIC_MAIN, TOPIC_DLQ } from './kafka.js';

const log = pino();

function backoffMs(attempt) {
  const base = Math.min(60000, Math.pow(2, attempt) * 1000);
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

async function processMessage(data) {
  const attempt = Number(data.attempt ?? 0);
  if (attempt < 2) throw new Error(`transient failure at attempt ${attempt}`);
  return { ok: true, attempt };
}

export async function startWorker() {
  await consumer.subscribe({ topic: TOPIC_MAIN, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const key = message.key?.toString();
      const raw = message.value?.toString() || '{}';

      let data;
      try { data = JSON.parse(raw); }
      catch {
        await producer.send({ topic: TOPIC_DLQ, messages: [{ key, value: raw }]});
        return;
      }

      try {
        const result = await processMessage(data);
        log.info({ key, result }, 'completed');
      } catch (err) {
        const attempt = Number(data.attempt ?? 0) + 1;
        if (attempt >= 5) {
          log.warn({ key, err: err.message }, 'to DLQ');
          await producer.send({ topic: TOPIC_DLQ, messages: [{ key, value: JSON.stringify(data) }]});
          return;
        }
        const delay = backoffMs(attempt);
        log.warn({ key, attempt, delay }, 'retrying');
        setTimeout(async () => {
          await producer.send({
            topic: TOPIC_MAIN,
            messages: [{ key, value: JSON.stringify({ ...data, attempt }) }],
          });
        }, delay);
      }
    },
  });

  log.info({ topic: TOPIC_MAIN }, 'worker started');
}

