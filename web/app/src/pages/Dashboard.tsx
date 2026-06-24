import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserButton, SignOutButton } from '@clerk/react';

type Tab = 'profile' | 'exams' | 'plans' | 'resources' | 'history' | 'about';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [userData, setUserData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login');
    }
  }, [isLoaded, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchSessions();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/users/' + user?.id);
      const data = await res.json();
      setUserData(data);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/sessions/user/' + user.id);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleGenerateExam = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setExamCode(data.sessionCode);
        fetchSessions();
      } else {
        alert(data.error || 'Failed to generate exam');
      }
    } catch (err) {
      console.error('Failed to generate exam:', err);
      alert('Failed to generate exam');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (sessionToken: string) => {
    navigate('/exam/' + sessionToken);
  };

  if (!isLoaded || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const planNames: Record<string, string> = {
    individual: 'Individual Act',
    anthology: 'The Anthology',
    globe: 'The Globe',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-cream)' }}>
      <aside style={{
        width: '260px',
        background: 'var(--card-white)',
        boxShadow: 'var(--shadow-soft)',
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', color: 'var(--sage)', fontFamily: 'var(--font-heading)' }}>Shakespeare</h1>
        </div>

        <nav style={{ flex: 1 }}>
          {(['profile', 'exams', 'plans', 'resources', 'history', 'about'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: activeTab === tab ? 'var(--olive)' : 'transparent',
                border: 'none',
                borderRadius: '0',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: 500,
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-subtle)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--olive)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginBottom: '4px' }}>{user?.primaryEmailAddress?.emailAddress}</p>
          <p style={{ fontSize: '12px', color: 'var(--sage)', fontWeight: 600 }}>{planNames[userData?.plan || 'individual']}</p>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '20px 48px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: 'var(--card-white)',
          boxShadow: 'var(--shadow-soft)',
          gap: '16px',
        }}>
          <span style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>{user?.firstName} {user?.lastName}</span>
          <SignOutButton>
            <button style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--olive)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              Logout
            </button>
          </SignOutButton>
        </header>

      <div style={{ flex: 1, padding: '48px', maxWidth: '1200px' }}>
        {activeTab === 'profile' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Profile</h2>
            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <div style={{ display: 'grid', gap: '24px', maxWidth: '400px' }}>
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>Name</label>
                  <p style={{ fontSize: '18px', fontWeight: 500 }}>{user?.firstName} {user?.lastName}</p>
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>Email</label>
                  <p style={{ fontSize: '18px' }}>{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>Current Plan</label>
                  <p style={{ fontSize: '18px', color: 'var(--sage)', fontWeight: 600 }}>{planNames[userData?.plan || 'individual']}</p>
                </div>
                <div>
                  <label style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>Exams Remaining</label>
                  <p style={{ fontSize: '18px', fontWeight: 600 }}>{userData?.examsRemaining ?? 1}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Your Exams</h2>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Generate New Exam</h3>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '16px' }}>
                You have <strong>{userData?.examsRemaining ?? 0}</strong> exams remaining.
              </p>
              <button
                onClick={handleGenerateExam}
                disabled={loading || (userData?.examsRemaining ?? 0) <= 0}
                style={{
                  padding: '14px 28px',
                  background: (loading || (userData?.examsRemaining ?? 0) <= 0) ? 'var(--olive)' : 'var(--sage)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: (loading || (userData?.examsRemaining ?? 0) <= 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Generating...' : 'Generate Exam Link'}
              </button>

              {examCode && (
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'var(--bg-cream)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginBottom: '8px' }}>Your exam code:</p>
                  <p style={{ fontSize: '36px', fontWeight: 700, color: 'var(--sage)', fontFamily: 'monospace', letterSpacing: '8px' }}>{examCode}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginTop: '8px' }}>Use this code to access your exam session</p>
                </div>
              )}
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Exam History</h3>
              {sessions.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)' }}>No exams yet. Generate your first exam above.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--olive)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Exam</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Score</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} style={{ borderBottom: '1px solid var(--olive)' }}>
                        <td style={{ padding: '16px 0' }}>{session.examTitle}</td>
                        <td style={{ padding: '16px 0' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: session.status === 'completed' ? 'var(--sage)' : session.status === 'in_progress' ? '#D4A5A5' : 'var(--olive)',
                            color: 'white',
                          }}>
                            {session.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 0', fontWeight: 600 }}>
                          {session.score !== null ? `${session.score}%` : '-'}
                        </td>
                        <td style={{ padding: '16px 0', color: 'var(--text-subtle)' }}>
                          {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          {session.status === 'pending' && (
                            <button
                              onClick={() => handleStartExam(session.sessionToken)}
                              style={{
                                padding: '8px 16px',
                                background: 'var(--sage)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Start
                            </button>
                          )}
                          {session.status === 'in_progress' && (
                            <button
                              onClick={() => handleStartExam(session.sessionToken)}
                              style={{
                                padding: '8px 16px',
                                background: '#D4A5A5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Continue
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Plans & Payments</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {[
                { name: 'Individual Act', price: 70, exams: 1, description: 'Perfect for a single proficiency assessment.', highlight: false },
                { name: 'The Anthology', price: 200, exams: 4, description: 'Full access for dedicated learners.', highlight: true },
                { name: 'The Globe', price: 20, exams: 'Unlimited', description: 'For teams and organizations.', highlight: false, perUser: true },
              ].map((plan, i) => (
                <div key={i} style={{
                  background: plan.highlight ? 'var(--sage)' : 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px',
                  boxShadow: 'var(--shadow-medium)',
                  color: plan.highlight ? 'white' : 'inherit',
                }}>
                  <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>{plan.name}</h3>
                  <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px' }}>{plan.description}</p>
                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px', fontWeight: 700 }}>${plan.price}</span>
                    {plan.perUser && <span style={{ fontSize: '16px', opacity: 0.8 }}>/user/mo</span>}
                    {!plan.perUser && <span style={{ fontSize: '16px', opacity: 0.8 }}> for {plan.exams} exam{plan.exams !== 1 ? 's' : ''}</span>}
                  </div>
                  <button
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: plan.highlight ? 'white' : 'var(--sage)',
                      color: plan.highlight ? 'var(--sage)' : 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {userData?.plan?.toLowerCase().replace(' ', '-') === plan.name.toLowerCase().replace(' ', '-') ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Resources</h2>
            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <p style={{ color: 'var(--text-subtle)' }}>Coming soon</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Exam History</h2>
            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              {sessions.filter(s => s.status === 'completed').length === 0 ? (
                <p style={{ color: 'var(--text-subtle)' }}>No completed exams yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--olive)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Exam</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Score</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: 'var(--text-subtle)', fontSize: '14px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.status === 'completed').map((session) => (
                      <tr key={session.id} style={{ borderBottom: '1px solid var(--olive)' }}>
                        <td style={{ padding: '16px 0' }}>{session.examTitle}</td>
                        <td style={{ padding: '16px 0', fontWeight: 600, color: 'var(--sage)' }}>{session.score}%</td>
                        <td style={{ padding: '16px 0', color: 'var(--text-subtle)' }}>
                          {session.submittedAt ? new Date(session.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: session.passed ? 'var(--sage)' : '#D4A5A5',
                            color: 'white',
                          }}>
                            {session.passed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>About Shakespeare</h2>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
              marginBottom: '24px',
            }}>
              <h3 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--sage)' }}>How It Works</h3>
              <p style={{ lineHeight: 1.8, marginBottom: '16px' }}>
                Shakespeare is a premium English proficiency evaluation platform. We provide standardized exams
                to assess your English language skills across reading, writing, and comprehension.
              </p>
              <p style={{ lineHeight: 1.8, color: 'var(--text-subtle)' }}>
                Choose a plan that fits your needs, generate exam sessions, and track your progress over time.
              </p>
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <h3 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--sage)' }}>FAQs</h3>
              {[
                { q: 'How do I access an exam?', a: 'After purchasing a plan, go to the Exams tab and click "Generate Exam Link". You will receive a code to start your exam session.' },
                { q: 'How long is each exam?', a: 'Each exam typically takes 30-60 minutes depending on the type.' },
                { q: 'Can I retake an exam?', a: 'Yes, if you have exams remaining in your plan.' },
                { q: 'What happens if I fail?', a: 'You can purchase additional exams or upgrade your plan for more attempts.' },
                { q: 'Are the exams timed?', a: 'Yes, each exam has a specific duration. The timer starts when you begin the exam.' },
              ].map((faq, i) => (
                <div key={i} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: i < 4 ? '1px solid var(--olive)' : 'none' }}>
                  <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>{faq.q}</h4>
                  <p style={{ color: 'var(--text-subtle)', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}