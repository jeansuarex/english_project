import { connectDB, getUsersCollection, getAttemptsCollection, getExamsCollection } from '../api/src/db';

async function seed() {
  await connectDB();

  const usersCollection = getUsersCollection();
  const attemptsCollection = getAttemptsCollection();
  const examsCollection = getExamsCollection();

  const exam = await examsCollection.findOne({ title: 'Basic English Proficiency Test' });
  if (!exam) {
    console.log('No exam found. Run seed-exam.ts first.');
    return;
  }

  const user = await usersCollection.findOne({ email: 'itsmeeing@gmail.com' });
  if (!user) {
    console.log('No user found. Register at /login first.');
    return;
  }

  const userId = user._id.toString();
  await attemptsCollection.deleteMany({ userId });

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);
  const attempt1 = {
    userId,
    examId: exam._id.toString(),
    startedAt: pastDate,
    submittedAt: new Date(pastDate.getTime() + 25 * 60 * 1000),
    status: 'completed',
    answers: {
      q1: 'She went to school yesterday.',
      q2: 'Cowardly',
      q3: 'under',
      q4: 'I have gone to the store.',
      q5: 'Yesterday I woke up early and went to the gym. Then I cooked breakfast and studied for my exam.',
      q6: 'on',
      q7: 'An',
      q8: 'Joyful',
    },
    score: 85,
    passed: true,
    passingScore: 70,
  };

  const attempt2Date = new Date();
  attempt2Date.setDate(attempt2Date.getDate() - 14);
  const attempt2 = {
    userId,
    examId: exam._id.toString(),
    startedAt: attempt2Date,
    submittedAt: new Date(attempt2Date.getTime() + 30 * 60 * 1000),
    status: 'completed',
    answers: {
      q1: 'She went to school yesterday.',
      q2: 'Cowardly',
      q3: 'under',
      q4: 'I have gone to the store.',
      q5: 'I went to the store and bought some food.',
      q6: 'on',
      q7: 'An',
      q8: 'Joyful',
    },
    score: 75,
    passed: true,
    passingScore: 70,
  };

  await attemptsCollection.insertMany([attempt1, attempt2]);

  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        examsCompleted: 2,
        totalScore: 160,
        averageScore: 80,
        examsRemaining: 1,
      },
    }
  );

  console.log('✓ Mock results seeded!');
  console.log('  User:', user.email);
  console.log('  Completed exams: 2 (85%, 75%)');
}

seed().catch(console.error);
