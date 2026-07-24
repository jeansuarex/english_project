import { connectDB, getUsersCollection } from './src/db.js';

async function main() {
  await connectDB();
  const col = await getUsersCollection();
  const users = await col.find({}).toArray();
  console.log(JSON.stringify(users.map(u => ({
    name: u.name,
    email: u.email,
    clerkId: u.clerkId
  })), null, 2));
  process.exit(0);
}

main().catch(console.error);