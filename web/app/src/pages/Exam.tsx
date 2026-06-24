import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  points: number;
}

interface ExamData {
  id: string;
  sessionToken: string;
  examTitle: string;
  examDuration: number;
  questions: Question[];
  status: string;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  passingScore: number;
}

export default function Exam() {
  const { token } = useParams<{ token: string }>();
  const { user } = useUser();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    async function loadExam() {
      if (!token) {
        setError('No exam token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/sessions/token/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load exam');
        }

        setExam(data);
        if (data.status === 'in_progress' && data.answers) {
          setAnswers(data.answers);
        }
        setTimeLeft(data.examDuration * 60);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    }

    loadExam();
  }, [token]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting || submitResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitting, submitResult]);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = useCallback(async () => {
    if (!exam || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/sessions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: exam.id,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit exam');
      }

      setSubmitResult(data);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit exam');
      setSubmitting(false);
    }
  }, [exam, answers, submitting]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
      }}>
        <p>Loading exam...</p>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
      }}>
        <div style={{
          padding: '48px',
          background: 'var(--card-white)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-medium)',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <h2 style={{ color: '#D4A5A5', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: 'var(--text-subtle)', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
        padding: '48px',
      }}>
        <div style={{
          padding: '48px',
          background: 'var(--card-white)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-medium)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: submitResult.passed ? 'var(--sage)' : '#D4A5A5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '36px',
            color: 'white',
          }}>
            {submitResult.passed ? '✓' : '✗'}
          </div>

          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>
            {submitResult.passed ? 'Congratulations!' : 'Keep Practicing'}
          </h2>

          <p style={{ color: 'var(--text-subtle)', marginBottom: '32px' }}>
            You scored <strong>{submitResult.score}%</strong>
            {submitResult.passed ? ' - Passed!' : ` - Need ${submitResult.passingScore}% to pass.`}
          </p>

          <div style={{
            padding: '24px',
            background: 'var(--bg-cream)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Your Score</span>
              <span style={{ fontWeight: 600, color: submitResult.passed ? 'var(--sage)' : '#D4A5A5' }}>
                {submitResult.score}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-subtle)' }}>Passing Score</span>
              <span style={{ fontWeight: 600 }}>{submitResult.passingScore}%</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam || !exam.questions.length) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>No Questions Available</h2>
          <p style={{ color: 'var(--text-subtle)' }}>This exam has no questions configured.</p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: 'var(--sage)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const questions = exam.questions;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-cream)', padding: '24px 48px' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        padding: '16px 24px',
        background: 'var(--card-white)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-soft)',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', color: 'var(--sage)', marginBottom: '4px' }}>{exam.examTitle}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>{answeredCount} of {questions.length} answered</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            padding: '12px 24px',
            background: timeLeft !== null && timeLeft < 300 ? '#D4A5A5' : 'var(--sage)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontFamily: 'monospace',
            fontSize: '18px',
          }}>
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '2px solid var(--text-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-subtle)',
              cursor: 'pointer',
            }}
          >
            Exit
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <main style={{ flex: 1 }}>
          <div style={{
            background: 'var(--card-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-medium)',
            padding: '48px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', color: 'var(--text-subtle)', fontSize: '14px' }}>
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{question.points} points</span>
            </div>

            <div style={{ height: '8px', background: 'var(--olive)', borderRadius: '4px', marginBottom: '32px' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--sage)',
                borderRadius: '4px',
                transition: 'width 0.3s',
              }} />
            </div>

            <h2 style={{ fontSize: '24px', marginBottom: '32px', lineHeight: 1.4 }}>{question.question}</h2>

            {question.type === 'multiple_choice' && question.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {question.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(question.id, option)}
                    style={{
                      padding: '16px 20px',
                      background: answers[question.id] === option ? 'var(--sage)' : 'var(--bg-cream)',
                      color: answers[question.id] === option ? 'white' : 'var(--text-primary)',
                      border: `2px solid ${answers[question.id] === option ? 'var(--sage)' : 'var(--olive)'}`,
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'left',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {question.type === 'essay' && (
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Write your answer here..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '16px',
                  border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  background: 'var(--bg-cream)',
                }}
              />
            )}

            {question.type === 'fill_blank' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Type your answer..."
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '16px',
                  background: 'var(--bg-cream)',
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '48px' }}>
              <button
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                style={{
                  padding: '14px 28px',
                  background: 'transparent',
                  border: '2px solid var(--sage)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--sage)',
                  fontWeight: 600,
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentQuestion === 0 ? 0.5 : 1,
                }}
              >
                Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion((prev) => prev + 1)}
                  style={{
                    padding: '14px 28px',
                    background: 'var(--sage)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '14px 28px',
                    background: submitting ? 'var(--olive)' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              )}
            </div>
          </div>
        </main>

        <aside style={{ width: '200px', flexShrink: 0 }}>
          <div style={{
            background: 'var(--card-white)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-soft)',
            padding: '24px',
            position: 'sticky',
            top: '24px',
          }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-subtle)' }}>Questions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(i)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: i === currentQuestion ? 'var(--sage)' : answers[q.id] ? 'var(--olive)' : 'var(--bg-cream)',
                    color: i === currentQuestion ? 'white' : 'var(--text-primary)',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--olive)' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: submitting ? 'var(--olive)' : 'var(--sage)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: answeredCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: answeredCount === 0 ? 0.5 : 1,
                }}
              >
                {submitting ? '...' : 'Submit'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}