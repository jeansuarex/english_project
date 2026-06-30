import { SignIn, SignUp } from '@clerk/react';
import { useSearchParams } from 'react-router-dom';

export default function Login() {
  const [searchParams] = useSearchParams();
  const isSignUp = searchParams.get('mode') === 'signup';

  if (isSignUp) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        background: 'var(--bg-cream)',
      }}>
        <SignUp
          fallbackRedirectUrl="/dashboard"
          routing="path"
          path="/login"
          signInUrl="/login?mode=signin"
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      background: 'var(--bg-cream)',
    }}>
      <SignIn
        fallbackRedirectUrl="/dashboard"
        routing="path"
        path="/login"
        signUpUrl="/login?mode=signup"
      />
    </div>
  );
}