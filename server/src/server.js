const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[api] MediQueue server listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});