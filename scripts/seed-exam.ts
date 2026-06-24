import { connectDB, getExamsCollection } from '../api/src/db';

const testExam = {
  title: 'Basic English Proficiency Test',
  description: 'A foundational assessment of English language skills covering grammar, vocabulary, and reading comprehension.',
  duration: 30,
  passingScore: 70,
  price: 70,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Choose the correct sentence:',
      options: [
        'She go to school yesterday.',
        'She went to school yesterday.',
        'She goed to school yesterday.',
        'She going to school yesterday.'
      ],
      correctAnswer: 'She went to school yesterday.',
      points: 10
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      question: 'Select the word that means the opposite of "brave":',
      options: ['Cowardly', 'Fearless', 'Heroic', 'Bold'],
      correctAnswer: 'Cowardly',
      points: 10
    },
    {
      id: 'q3',
      type: 'fill_blank',
      question: 'Complete the sentence: "The cat is ___ the table."',
      correctAnswer: 'under',
      points: 10
    },
    {
      id: 'q4',
      type: 'multiple_choice',
      question: 'Which sentence uses the correct past tense?',
      options: [
        'I have went to the store.',
        'I have gone to the store.',
        'I have go to the store.',
        'I have going to the store.'
      ],
      correctAnswer: 'I have gone to the store.',
      points: 10
    },
    {
      id: 'q5',
      type: 'essay',
      question: 'In 2-3 sentences, describe your daily routine using at least 5 different verbs in past tense.',
      points: 20
    },
    {
      id: 'q6',
      type: 'multiple_choice',
      question: 'Choose the correct preposition: "The book is ___ the shelf."',
      options: ['in', 'on', 'at', 'to'],
      correctAnswer: 'on',
      points: 10
    },
    {
      id: 'q7',
      type: 'fill_blank',
      question: 'Complete with the correct article: "___ elephant is a large animal."',
      correctAnswer: 'An',
      points: 10
    },
    {
      id: 'q8',
      type: 'multiple_choice',
      question: 'Which word is a synonym for "happy"?',
      options: ['Sad', 'Joyful', 'Angry', 'Tired'],
      correctAnswer: 'Joyful',
      points: 10
    }
  ]
};

async function seed() {
  await connectDB();

  const examsCollection = getExamsCollection();

  const existing = await examsCollection.findOne({ title: testExam.title });
  if (existing) {
    console.log('Exam already exists:', testExam.title);
    console.log('Exam ID:', existing._id.toString());
    console.log('\nTo send a magic link, use this examId:', existing._id.toString());
    return;
  }

  const result = await examsCollection.insertOne(testExam);
  console.log('✓ Test exam created!');
  console.log('Exam ID:', result.insertedId.toString());
  console.log('Title:', testExam.title);
  console.log('Questions:', testExam.questions.length);
  console.log('Duration:', testExam.duration, 'minutes');
}

seed().catch(console.error);
