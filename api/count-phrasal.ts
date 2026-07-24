import { connectDB, getDB } from './src/db.js';

async function main() {
  await connectDB();
  const db = getDB();
  
  // Check phrasal_verbs table
  try {
    const result = db.query('SELECT COUNT(*) as count FROM phrasal_verbs').get();
    console.log('Phrasal verbs count:', result.count);
  } catch (e) {
    console.log('phrasal_verbs table not found or error:', e.message);
  }
  
  // Also check game_sessions
  try {
    const games = db.query('SELECT COUNT(*) as count FROM game_sessions WHERE gameType = ?', 'phrasal-verbs').get();
    console.log('Phrasal verb game sessions:', games.count);
  } catch (e) {
    console.log('game_sessions error:', e.message);
  }
  
  process.exit(0);
}

main().catch(console.error);