// cat > services/node-api/src/kafka.js <<'EOF'
import { Kafka, Partitioners, logLevel } from 'kafkajs';
import pino from 'pino';
import { CFG } from './config.js';
const log = pino();

const kafka = new Kafka({
  clientId: 'node-api',
  brokers: [CFG.BROKER],
  logLevel: logLevel.WARN,
});

export const producer = kafka.producer({
  // Be explicit about partitioner (pick one and stick to it)
  createPartitioner: Partitioners.LegacyPartitioner
});
export const consumer = kafka.consumer({ groupId: 'node-api-workers' });

async function ensureTopics() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        { topic: CFG.TOPIC_MAIN, numPartitions: 3, replicationFactor: 1 },
        { topic: CFG.TOPIC_DLQ,  numPartitions: 1, replicationFactor: 1 },
      ],
    });
    log.info({ topics: [CFG.TOPIC_MAIN, CFG.TOPIC_DLQ] }, 'topics ensured');
  } finally {
    await admin.disconnect();
  }
}

export async function initKafka() {
  await ensureTopics();
  await producer.connect();
  await consumer.connect();
  log.info({ broker: CFG.BROKER }, 'Kafka connected');
}

export async function kafkaReady() {
  // simple readiness: fetch metadata; throws if broker down
  const admin = kafka.admin();
  await admin.connect();
  await admin.fetchTopicMetadata({ topics: [CFG.TOPIC_MAIN] });
  await admin.disconnect();
  return true;
}
// EOF
