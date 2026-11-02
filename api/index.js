require('dotenv').config();

const app = require('../src/app');
const { connectDatabase } = require('../src/database');

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.searchParams.get('path');
    if (path !== null) {
      url.searchParams.delete('path');
      req.url = `/${path}${url.search}`;
    }
    await connectDatabase();
    app(req, res);
  } catch (error) {
    console.error(JSON.stringify({ event: 'database_connection_failed', type: error.name }));
    res.status(503).json({ data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'The database is temporarily unavailable. Please try again.' } });
  }
};
