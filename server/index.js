const app = require('./src/app');
const config = require('./src/config/env');
const prisma = require('./src/config/db');
const { startReminderScheduler } = require('./src/services/reminderScheduler');

const PORT = config.port || 5000;
const HOST = '0.0.0.0'; // Bind to all interfaces for Railway/cloud hosting

async function startServer() {
  try {
    console.log(`⏳ Connecting to database...`);
    // Test Database connection
    await prisma.$connect();
    console.log('🔌 Connected to PostgreSQL Database via Prisma.');

    // Start the class reminder cron scheduler
    startReminderScheduler();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running in ${config.env} mode on http://${HOST}:${PORT}`);
      console.log(`✅ Health check available at http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error);
    process.exit(1);
  }
}

startServer();
