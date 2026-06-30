import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react';
import { Moon, Sun } from 'lucide-react';
import './styles/globals.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reading from './pages/Reading';
import Listening from './pages/Listening';
import Definitions from './pages/Definitions';
import Transformations from './pages/Transformations';
import PhrasalVerbs from './pages/PhrasalVerbs';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

function App() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
        transition: 'background 0.3s ease',
      }}>
        <h1 style={{ fontSize: '28px', color: 'var(--sage)' }}>Shakespeare</h1>
        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/" style={{ fontWeight: 500 }}>Home</a>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--olive)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'var(--text-primary)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-muted-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button style={{
                padding: '10px 20px',
                background: 'var(--sage-gradient)',
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
            <UserButton />
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
          <SignUpButton mode="modal">
            <button style={{
              padding: '16px 32px',
              background: 'var(--sage-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '16px',
              cursor: 'pointer',
            }}>
              Sign Up
            </button>
          </SignUpButton>
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
              { title: 'Reading Practice', desc: 'Upload PDFs and practice reading comprehension with built-in vocabulary tracking.' },
              { title: 'Listening Training', desc: 'Train your ear and sharpen your spelling with audio-based word exercises.' },
              { title: 'Distraction-Free', desc: 'Clean, focused interface designed for effective language learning.' },
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
          <h3 style={{ fontSize: '40px', marginBottom: '24px' }}>Start Practicing Today</h3>
          <p style={{ fontSize: '18px', color: 'var(--text-subtle)', marginBottom: '40px' }}>
            Sign up and start improving your English skills.
          </p>
        </section>
      </main>

      <footer style={{
        padding: '32px 48px',
        background: 'var(--card-white)',
        borderTop: '1px solid var(--border-light)',
        textAlign: 'center',
        color: 'var(--text-subtle)',
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
        <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reading/:resourceId" element={<ProtectedRoute><Reading /></ProtectedRoute>} />
            <Route path="/listening" element={<ProtectedRoute><Listening /></ProtectedRoute>} />
            <Route path="/definitions" element={<ProtectedRoute><Definitions /></ProtectedRoute>} />
            <Route path="/transformations" element={<ProtectedRoute><Transformations /></ProtectedRoute>} />
            <Route path="/phrasal-verbs" element={<ProtectedRoute><PhrasalVerbs /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      </ClerkProvider>
  </React.StrictMode>
);