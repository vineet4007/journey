
import { Kafka, logLevel } from 'kafkajs';
import pino from 'pino';
const log = pino();

const broker = process.env.KAFKA_BROKER || '127.0.0.1:9092';
const TOPIC_MAIN = process.env.TOPIC_MAIN || 'jobs';
const TOPIC_DLQ  = process.env.TOPIC_DLQ  || 'jobs-dlq';

log.info({ broker }, 'config');

const kafka = new Kafka({
  clientId: 'node-api',
  brokers: [broker],
  logLevel: logLevel.WARN,
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'node-api-workers' });

async function ensureTopics() {
  const admin = kafka.admin();
  await admin.connect();
  try {
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        { topic: TOPIC_MAIN, numPartitions: 3, replicationFactor: 1 },
        { topic: TOPIC_DLQ,  numPartitions: 1, replicationFactor: 1 },
      ],
    });
    log.info({ topics: [TOPIC_MAIN, TOPIC_DLQ] }, 'topics ensured');
  } finally {
    await admin.disconnect();
  }
}

export async function initKafka() {
  await ensureTopics();
  await producer.connect();
  await consumer.connect();
  log.info('Kafka connected');
}

export { TOPIC_MAIN, TOPIC_DLQ };

