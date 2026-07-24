import { connectDB, getDB } from './src/db.js';

async function main() {
  await connectDB();
  const db = getDB();
  
  // List all tables
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name));
  
  process.exit(0);
}

main().catch(console.error);