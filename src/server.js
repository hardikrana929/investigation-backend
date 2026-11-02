require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const port = process.env.PORT || 5000;
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  app.listen(port, () => console.log(`Mystery API listening on ${port}`));
}
start().catch(err => { console.error(`Startup failed (${err.name}). Check the database configuration.`); process.exit(1); });
