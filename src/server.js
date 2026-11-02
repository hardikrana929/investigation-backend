require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./database');
const port = process.env.PORT || 5000;
async function start() {
  await connectDatabase();
  app.listen(port, () => console.log(`Mystery API listening on ${port}`));
}
start().catch(err => { console.error(`Startup failed (${err.name}). Check the database configuration.`); process.exit(1); });
