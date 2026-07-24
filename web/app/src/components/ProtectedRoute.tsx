import { useUser, useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const POLL_INTERVAL = 30000

interface SubscriptionInfo {
  days_left: number
  subscription_end: string | null
  subscription_start: string | null
  subscription_status: 'none' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired'
  has_access: boolean
  is_new_user: boolean
  has_used_free_days: boolean
}

async function syncUser(token: string) {
  try {
    await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error('Error syncing user:', err);
  }
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!isSignedIn || !user) return;

    try {
      const token = await getToken();
      if (!token) return;
      await syncUser(token);

      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data: SubscriptionInfo = await res.json();
        if (!data.has_access) {
          navigate('/pricing');
        }
      } else {
        navigate('/pricing');
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setChecking(false);
    }
  }, [isSignedIn, user, getToken, navigate]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/login');
      return;
    }

    if (isLoaded && isSignedIn && user) {
      checkSubscription();

      const interval = setInterval(checkSubscription, POLL_INTERVAL);
      const onFocus = () => checkSubscription();

      window.addEventListener('focus', onFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [isLoaded, isSignedIn, user, navigate, checkSubscription]);

  if (!isLoaded || checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-cream)',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

export function useSubscription() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!isSignedIn || !user) return;

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user, getToken]);

  useEffect(() => {
    if (isSignedIn && user) {
      fetchSubscription();

      const interval = setInterval(fetchSubscription, POLL_INTERVAL);
      const onFocus = () => fetchSubscription();

      window.addEventListener('focus', onFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [isSignedIn, user, fetchSubscription]);

  return { subscription, loading, refetch: fetchSubscription };
}

export function formatDaysRemaining(days: number, endDate: string | null): string {
  if (days <= 0 || !endDate) return 'No active subscription';

  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
  }

  const diffDays = Math.ceil(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
}
