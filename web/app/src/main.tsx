import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react';
import './styles/globals.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Exam from './pages/Exam';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard');
    }
  }, [isSignedIn, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '24px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-white)',
        boxShadow: 'var(--shadow-soft)',
      }}>
        <h1 style={{ fontSize: '28px', color: 'var(--sage)' }}>Shakespeare</h1>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="/" style={{ fontWeight: 500 }}>Home</a>
          <a href="/pricing" style={{ fontWeight: 500 }}>Pricing</a>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button style={{
                padding: '10px 20px',
                background: 'var(--sage)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{
          padding: '120px 48px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--card-white) 0%, var(--bg-cream) 100%)',
        }}>
          <h2 style={{ fontSize: '64px', marginBottom: '24px', color: 'var(--text-primary)' }}>
            Master the Art of English
          </h2>
          <p style={{ fontSize: '20px', color: 'var(--text-subtle)', maxWidth: '600px', margin: '0 auto 48px' }}>
            Premium English proficiency evaluations crafted with academic precision.
            Experience evaluation that feels like an education.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a href="/pricing" style={{
              padding: '16px 32px',
              background: 'var(--sage)',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '16px',
            }}>
              View Plans
            </a>
            <SignUpButton mode="modal">
              <button style={{
                padding: '16px 32px',
                background: 'transparent',
                color: 'var(--sage)',
                border: '2px solid var(--sage)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
              }}>
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </section>

        <section style={{ padding: '96px 48px' }}>
          <h3 style={{ fontSize: '40px', textAlign: 'center', marginBottom: '64px' }}>Why Shakespeare?</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '32px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}>
            {[
              { title: 'Academic Precision', desc: 'Evaluations designed by linguistics experts to accurately measure your proficiency level.' },
              { title: 'Distraction-Free', desc: 'Our specialized exam interface eliminates all distractions for pure focus.' },
              { title: 'Flexible Access', desc: 'From single exams to annual subscriptions, choose the plan that fits your journey.' },
            ].map((feature, i) => (
              <div key={i} style={{
                padding: '40px',
                background: 'var(--card-white)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-soft)',
              }}>
                <h4 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--sage)' }}>{feature.title}</h4>
                <p style={{ color: 'var(--text-subtle)' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{
          padding: '96px 48px',
          background: 'var(--card-white)',
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: '40px', marginBottom: '24px' }}>Ready to Begin?</h3>
          <p style={{ fontSize: '18px', color: 'var(--text-subtle)', marginBottom: '40px' }}>
            Choose your plan and take your first step towards English mastery.
          </p>
          <a href="/pricing" style={{
            padding: '16px 40px',
            background: 'var(--sage)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '16px',
            display: 'inline-block',
          }}>
            View Pricing
          </a>
        </section>
      </main>

      <footer style={{
        padding: '32px 48px',
        background: 'var(--text-primary)',
        color: 'var(--card-white)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '14px' }}>© 2026 Shakespeare. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Pricing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '24px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-white)',
        boxShadow: 'var(--shadow-soft)',
      }}>
        <a href="/" style={{ fontSize: '28px', color: 'var(--sage)', fontFamily: 'var(--font-heading)' }}>Shakespeare</a>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="/" style={{ fontWeight: 500 }}>Home</a>
          <a href="/pricing" style={{ fontWeight: 500, color: 'var(--sage)' }}>Pricing</a>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button style={{
                padding: '10px 20px',
                background: 'var(--sage)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton afterSignOutUrl="/" />
          </Show>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '96px 48px' }}>
        <h2 style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>Choose Your Path</h2>
        <p style={{ fontSize: '18px', color: 'var(--text-subtle)', textAlign: 'center', marginBottom: '64px' }}>
          Select the plan that best fits your English learning journey.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {[
            {
              name: 'Individual Act',
              price: 70,
              period: 'single exam',
              description: 'Perfect for a single proficiency assessment.',
              features: ['One complete exam', 'Detailed results', 'Certificate of completion'],
            },
            {
              name: 'The Anthology',
              price: 200,
              period: 'year',
              description: 'Full access for dedicated learners.',
              features: ['4 exams every 3 months', 'Priority support', 'Progress tracking', 'Detailed analytics'],
              highlight: true,
            },
            {
              name: 'The Globe',
              price: 20,
              period: 'per user/month',
              description: 'For teams and organizations.',
              features: ['Unlimited team exams', 'Admin dashboard', 'Team analytics', 'Custom branding', 'API access'],
            },
          ].map((plan, i) => (
            <div key={i} style={{
              padding: '48px 40px',
              background: plan.highlight ? 'var(--sage)' : 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-medium)',
              color: plan.highlight ? 'white' : 'inherit',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h3 style={{ fontSize: '28px', marginBottom: '8px' }}>{plan.name}</h3>
              <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>{plan.description}</p>
              <div style={{ marginBottom: '32px' }}>
                <span style={{ fontSize: '56px', fontWeight: 700 }}>${plan.price}</span>
                <span style={{ fontSize: '16px', opacity: 0.8 }}>/{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', marginBottom: '40px', flex: 1 }}>
                {plan.features.map((feature, j) => (
                  <li key={j} style={{ padding: '8px 0', borderBottom: '1px solid', borderColor: plan.highlight ? 'rgba(255,255,255,0.2)' : 'var(--olive)' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button style={{
                    padding: '16px',
                    background: plan.highlight ? 'white' : 'var(--sage)',
                    color: plan.highlight ? 'var(--sage)' : 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}>
                    Get Started
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <a href="/dashboard" style={{
                  padding: '16px',
                  background: plan.highlight ? 'white' : 'var(--sage)',
                  color: plan.highlight ? 'var(--sage)' : 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '16px',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}>
                  Go to Dashboard
                </a>
              </Show>
            </div>
          ))}
        </div>
      </main>

      <footer style={{
        padding: '32px 48px',
        background: 'var(--text-primary)',
        color: 'var(--card-white)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '14px' }}>© 2026 Shakespeare. All rights reserved.</p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
<ClerkProvider
          publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/exam/:attemptId" element={<ProtectedRoute><Exam /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ClerkProvider>
  </React.StrictMode>
);