if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .replace(/&channel_binding=[^&]*/g, '')
    .replace(/\?channel_binding=[^&]*&/g, '?')
    .replace(/\?channel_binding=[^&]*/g, '');
}

const app = require('../server/src/app');
const prisma = require('../server/src/config/db');

module.exports = async (req, res) => {
  try {
    // Ensure DB connection is open
    await prisma.$connect();
  } catch (err) {
    console.error('Prisma connection error in serverless handler:', err);
  }
  return app(req, res);
};
