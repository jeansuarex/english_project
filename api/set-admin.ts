import { connectDB, getUsersCollection } from './src/db.js';

async function main() {
  await connectDB();
  const users = getUsersCollection();
  
  // Find user by clerkId or email
  const user = users.findOne({ clerkId: 'user_3FpowY3GVMgzdoqgR4pFE5zS1jG' });
  
  if (!user) {
    console.log('User not found');
  } else {
    console.log('Found user:', user.name, user.email, 'current role:', user.role);
    users.updateOne({ clerkId: 'user_3FpowY3GVMgzdoqgR4pFE5zS1jG' }, { $set: { role: 'admin' } });
    console.log('Updated role to admin');
  }
  
  process.exit(0);
}

main().catch(console.error);