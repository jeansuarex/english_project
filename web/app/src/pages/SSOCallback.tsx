import { useClerk, useUser } from '@clerk/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = async (token: string) => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || '';
        const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || email;

        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, name: fullName })
        });
      } catch (err) {
        console.error('Error syncing user:', err);
      }
    };

    handleRedirectCallback({ routerPush: (to) => navigate(to) })
      .then(async () => {
        if (user) {
          const token = await window.clerk.session?.getToken();
          if (token) {
            await syncUser(token);
          }
        }
        navigate('/dashboard');
      })
      .catch(() => {
        navigate('/login');
      });
  }, [handleRedirectCallback, navigate, user]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-cream)',
    }}>
      <p>Completing sign in...</p>
    </div>
  );
}
