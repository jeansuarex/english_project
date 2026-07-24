import { Hono } from 'hono'
import { clerkAuth } from '../middleware/auth'
import { getOutputHistoryCollection } from '../db'

const output = new Hono()

function genId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

interface QnA {
  question: string
  answer: string
}

interface AnalyzeRequest {
  answers: QnA[]
}

output.post('/analyze', clerkAuth, async (c) => {
  const { answers } = await c.req.json<AnalyzeRequest>()

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return c.json({ error: 'No answers provided' }, 400)
  }

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    return c.json({ error: 'Minimax API key not configured' }, 500)
  }

  const formattedAnswers = answers
    .map((a, i) => `Question ${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
    .join('\n\n')

  const systemPrompt = `You are a strict, expert English language evaluator specializing in CEFR (Common European Framework of Reference) levels. Your evaluations must be accurate and honest. Do NOT inflate scores.

CEFR Level Definitions (be strict!):
- C2: Native-like fluency. Complex ideas expressed effortlessly. Near-perfect grammar, vocabulary, and coherence. Can handle abstract, academic, and specialized topics with complete mastery.
- C1: Advanced but not native-like. Can express complex ideas clearly. Good range of vocabulary and complex grammatical structures. May have occasional minor errors that don't impede communication.
- B2: Upper-intermediate. Can express opinions and discuss topics reasonably clearly. Vocabulary is adequate but not rich. Some grammatical errors present but communication is generally effective.
- B1: Intermediate. Basic sentences with limited vocabulary. Frequent grammatical errors that sometimes impede understanding. Simple ideas expressed but lacks complexity and fluency.
- A2: Basic. Very simple sentences. Frequent errors that significantly impede communication. Limited to predictable, routine situations.
- A1: Beginner. Can only produce isolated words or very short phrases.

Evaluation Criteria (apply strictly):
1. Grammar: Count errors. 0-1 minor errors = C+, frequent errors = B or lower
2. Vocabulary: Rich and varied = C+, repetitive/basic = B or lower
3. Coherence: Logical flow, transitions = C+, choppy/disconnected = B or lower
4. Complexity: Complex sentences with clauses = C+, mostly simple sentences = B or lower
5. Task Achievement: Fully addresses prompt = C+, partially or superficially = B or lower

IMPORTANT: Be HONEST. Most non-native speakers are B1-B2. If the answer has frequent errors, simple vocabulary, and choppy sentences, rate it B1. Do NOT give B2 or higher to avoid disappointing users - that harms their learning.

Respond ONLY with a valid JSON object in this exact format, no markdown, no extra text:
{
  "level": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" (your strict CEFR estimate based on all answers),
  "levelReason": "A brief 1-2 sentence explanation of why you assigned this level, mentioning specific weaknesses),
  "feedback": [
    {
      "question": "the question text",
      "strengths": "what the user did well (1-2 sentences, be specific)",
      "improvements": "specific constructive feedback on grammar, vocabulary, or expression (2-3 sentences, be harsh and specific about errors)",
      "example": "an improved version of part of their answer, or an example sentence relevant to the question (in quotes)"
    }
  ],
  "overallFeedback": "2-3 sentences of general advice on what to focus on next, be specific about weaknesses"
}`

  const userPrompt = `Please evaluate these answers to English language questions:\n\n${formattedAnswers}`

  try {
    const response = await fetch('https://api.minimaxi.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Minimax API error:', response.status, errorText)
      return c.json({ error: 'AI analysis service unavailable' }, 503)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return c.json({ error: 'No response from AI' }, 500)
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('Failed to parse AI response as JSON:', content)
      return c.json({ error: 'Failed to parse AI response' }, 500)
    }

    // Save to history
    try {
      const historyCollection = getOutputHistoryCollection()
      const userId = (c as any).get('clerkUserId')

      for (const answer of answers) {
        const feedbackItem = parsed.feedback?.find((f: any) => f.question === answer.question)
        await historyCollection.insertOne({
          id: genId(),
          userId,
          question: answer.question,
          level: parsed.level,
          levelReason: parsed.levelReason || '',
          feedback: JSON.stringify(feedbackItem || {}),
          completedAt: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Failed to save to history:', err)
    }

    return c.json(parsed)
  } catch (error) {
    console.error('Analyze error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

output.get('/history', clerkAuth, async (c) => {
  try {
    const userId = (c as any).get('clerkUserId')
    const historyCollection = getOutputHistoryCollection()

    const history = await historyCollection
      .find({ userId })
      .sort({ completedAt: -1 })
      .limit(50)
      .toArray()

    return c.json(history.map((h: any) => ({
      id: h.id,
      question: h.question,
      level: h.level,
      levelReason: h.levelReason,
      completedAt: h.completedAt
    })))
  } catch (error) {
    console.error('Get output history error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default output
