// cat > services/node-api/src/config.js <<'EOF'
import dotenv from 'dotenv';
dotenv.config();

function req(name, def) {
  const v = process.env[name] ?? def;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const CFG = {
  PORT: Number(req('PORT', 3000)),
  BROKER: req('KAFKA_BROKER', '127.0.0.1:9092'),
  TOPIC_MAIN: req('TOPIC_MAIN', 'jobs'),
  TOPIC_DLQ: req('TOPIC_DLQ', 'jobs-dlq'),
  MAX_ATTEMPTS: Number(req('MAX_ATTEMPTS', 5)),
};
// EOF
