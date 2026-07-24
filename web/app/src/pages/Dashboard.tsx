import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/react';
import {
  User, FolderOpen, Info, BookOpen, BookMarked, Shuffle, Headphones, Link,
  ArrowLeft, Moon, Sun, FileText, X, BarChart3, ArrowLeftCircle, Calendar, Clock, Video, CheckCircle, MessageSquareText, ClipboardList, AlertTriangle, LogOut, ShoppingCart, Check, ChevronRight, ChevronLeft, Star, Award, GraduationCap, FileCheck, Clock3, Share2, Sparkles, Users
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import ActivityGrid from '../components/ActivityGrid';
import Badges from '../components/Badges';
import { formatDaysRemaining } from '../components/ProtectedRoute';

type Tab = 'profile' | 'practice' | 'progress' | 'about' | 'schedule' | 'exam';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [practiceSection, setPracticeSection] = useState<string | null>(null);
  const [practice, setPractice] = useState<any[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showListeningModal, setShowListeningModal] = useState(false);
  const [listeningRounds, setListeningRounds] = useState(5);
  const [showDefinitionsModal, setShowDefinitionsModal] = useState(false);
  const [definitionsRounds, setDefinitionsRounds] = useState(5);
  const [showTransformationsModal, setShowTransformationsModal] = useState(false);
  const [transformationsRounds, setTransformationsRounds] = useState(5);
  const [showPhrasalVerbsModal, setShowPhrasalVerbsModal] = useState(false);
  const [phrasalVerbsRounds, setPhrasalVerbsRounds] = useState(5);
  const [showOutputInfoModal, setShowOutputInfoModal] = useState(false);
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [progressView, setProgressView] = useState<string | null>(null);
  const [vocabularyWords, setVocabularyWords] = useState<string[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [outputHistory, setOutputHistory] = useState<any[]>([]);
  const [outputHistoryLoading, setOutputHistoryLoading] = useState(false);
  const cefrOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userCefrLevel = outputHistory.length > 0
    ? outputHistory.reduce((highest, item) => {
        const hIdx = cefrOrder.indexOf(highest);
        const iIdx = cefrOrder.indexOf(item.level);
        return iIdx > hIdx ? item.level : highest;
      }, 'A1')
    : null;
  const [subscription, setSubscription] = useState<any>(null);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ teacher: string; slot: string; datetime: string } | null>(null);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login');
    }
  }, [isLoaded, user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'practice') {
      setActiveTab('practice');
    }

    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success' && user) {
      const pendingBooking = sessionStorage.getItem('pendingSessionBooking');
      if (pendingBooking) {
        const { teacherId, teacherName, dateTime, topic } = JSON.parse(pendingBooking);
        bookSession(teacherId, teacherName, topic, dateTime);
        sessionStorage.removeItem('pendingSessionBooking');
        fetchBookedSessions();
      }
    } else if (paymentStatus === 'cancelled') {
      sessionStorage.removeItem('pendingSessionBooking');
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchBookedSessions();
    }
  }, [user]);

  const fetchBookedSessions = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/sessions?clerkUserId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBookedSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Error fetching booked sessions:', err);
    }
  };

  const parseSlotToDatetime = (slot: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const match = slot.match(/(\w+)\s+(\d+):(\d+)\s*([AP]M)/i);
    if (!match) return new Date().toISOString();
    const [, dayStr, hour, minute, ampm] = match;
    const dayIndex = days.findIndex(d => d.toLowerCase() === dayStr.toLowerCase());
    if (dayIndex === -1) return new Date().toISOString();
    const now = new Date();
    const result = new Date(now);
    const diffDays = (dayIndex - now.getDay() + 7) % 7 || 7;
    result.setDate(now.getDate() + diffDays);
    let h = parseInt(hour);
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    result.setHours(h, parseInt(minute), 0, 0);
    return result.toISOString();
  };

  const bookSession = async (teacherClerkId: string, teacherName: string, slot: string, datetime: string) => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teacherId: teacherClerkId,
          studentId: user.id,
          sessionDatetime: datetime,
          topic: 'English Conversation'
        }),
      });
      if (res.ok) {
        setShowRequestConfirm(true);
        fetchBookedSessions();
      }
    } catch (err) {
      console.error('Error booking session:', err);
    }
  };

  const generateNextDays = (count: number) => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const generateTimeSlots = (startHour: number, endHour: number, intervalMinutes: number = 60) => {
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      slots.push(`${hour12}:00 ${ampm}`);
      if (intervalMinutes === 60) continue;
      slots.push(`${hour12}:30 ${ampm}`);
    }
    return slots;
  };

  const isTimeSlotPast = (date: Date, timeStr: string) => {
    const [hourStr, ampm] = timeStr.split(' ');
    let hour = parseInt(hourStr);
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return slotDate < new Date();
  };

  const confirmBooking = async () => {
    if (!selectedTeacher || !selectedDate || !selectedTime || !user) return;
    const teacher = teachers.find(t => t.clerkId === selectedTeacher);
    if (!teacher) return;

    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const fullSlot = `${dayName} ${selectedTime}`;
    const datetime = parseSlotToDatetime(`${dayName} ${selectedTime}`);

    try {
      const token = await getToken();
      const priceId = import.meta.env.VITE_STRIPE_PRICE_SESSION;

      if (!priceId) {
        console.error('Session price ID not configured');
        return;
      }

      sessionStorage.setItem('pendingSessionBooking', JSON.stringify({
        teacherId: selectedTeacher,
        teacherName: teacher.name,
        dateTime: datetime,
        topic: 'English Conversation'
      }));

      const res = await fetch('/api/subscription/create-session-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          price_id: priceId,
          teacherId: selectedTeacher,
          teacherName: teacher.name,
          dateTime: datetime,
          topic: 'English Conversation'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        console.error('Failed to create checkout session');
        sessionStorage.removeItem('pendingSessionBooking');
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      sessionStorage.removeItem('pendingSessionBooking');
    }
  };

  const teachers = [
    { name: 'Cesar Santiago', clerkId: 'user_3GCWSptph5pGAjI6FjOLLjzNLMo', image: '/teachers/Cesar Santiago.jpg', specialty: 'Conversation & Business', description: 'Native English speaker with 8+ years of experience teaching conversation and business English. Specializes in helping students gain confidence in real-world speaking situations.', availability: { Monday: [14, 17], Wednesday: [14, 17], Friday: [14, 17] } },
    { name: 'Roberto Lopez', clerkId: 'user_2abc123', image: '/teachers/Roberto Lopez.png', specialty: 'Grammar & Exam Prep', description: 'Certified ESL teacher specializing in grammar, pronunciation, and exam preparation (IELTS/TOEFL). His structured approach helps students master the building blocks of English.', availability: { Tuesday: [13, 16], Thursday: [13, 16], Saturday: [10, 13] } },
  ] as const;

  const fetchSubscription = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const fetchPractice = async () => {
    if (!user) return;
    setPracticeLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/resources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Failed to fetch resources:', res.status, res.statusText);
        setPractice([]);
        return;
      }
      const data = await res.json();
      setPractice(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setPractice([]);
    } finally {
      setPracticeLoading(false);
    }
  };

  const fetchActivityData = async () => {
    if (!user) return;
    setActivityLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/activity?days=365', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActivityData(Array.isArray(data) ? data : []);
    } catch {
      setActivityData([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const logActivity = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      await fetch('/api/activity/log', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  }, [user, getToken]);

  useEffect(() => {
    logActivity();
  }, [logActivity]);

  const fetchVocabulary = useCallback(async () => {
    if (!user) return;
    setVocabLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/vocabulary/learned', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVocabularyWords(Array.isArray(data) ? data.map((d: { word: string }) => d.word) : []);
    } catch {
      setVocabularyWords([]);
    } finally {
      setVocabLoading(false);
    }
  }, [user, getToken]);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    setBadgesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/progress/badges', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBadges(Array.isArray(data) ? data : []);
    } catch {
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  }, [user, getToken]);

  const fetchOutputHistory = useCallback(async () => {
    if (!user) return;
    setOutputHistoryLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/output/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOutputHistory(Array.isArray(data) ? data : []);
    } catch {
      setOutputHistory([]);
    } finally {
      setOutputHistoryLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchVocabulary();
      fetchOutputHistory();
    }
  }, [activeTab, user, fetchVocabulary, fetchOutputHistory]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchActivityData();
      fetchBadges();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user && activeTab === 'practice' && practiceSection === 'reading') {
      fetchPractice();
    }
  }, [user, activeTab, practiceSection]);

  const handleUpload = async (file: File) => {
    if (!user || file.type !== 'application/pdf') return;
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.pdf$/i, ''));
      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        fetchResources();
      } else {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDeleteResource = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/resources/' + id, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPractice((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-cream)' }}>
      <aside style={{
        width: '260px',
        minHeight: '100vh',
        background: 'var(--card-white)',
        boxShadow: 'var(--shadow-soft)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        <div style={{ padding: '24px 24px 16px' }}>
          <h1 style={{ fontSize: '24px', color: 'var(--sage)', fontFamily: 'var(--font-heading)' }}>Shakespeare</h1>
        </div>

        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
        }}>
          {([['profile', User], ['practice', FolderOpen], ['progress', BarChart3], ['schedule', Calendar], ['exam', ClipboardList], ['about', Info]] as [Tab, any][]).map(([tab, Icon]) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPracticeSection(null); setProgressView(null); }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: activeTab === tab ? 'var(--olive)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'left',
                fontSize: '15px',
                fontWeight: 500,
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textTransform: 'capitalize',
                marginBottom: '4px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = 'var(--bg-cream)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              {tab}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--card-white)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="Profile"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '16px',
                flexShrink: 0,
              }}>
                {user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'U'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                {user?.primaryEmailAddress?.emailAddress}
              </p>
              {subscription && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: subscription.days_left <= 7 ? 'var(--danger-dark)' : 'var(--sage)',
                  fontWeight: 500,
                }}>
                  {subscription.days_left <= 7 ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <Calendar size={12} />
                  )}
                  {subscription.days_left} days left
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: 'var(--card-white)',
          boxShadow: 'var(--shadow-soft)',
          gap: '8px',
          transition: 'background 0.3s ease',
        }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-subtle)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              padding: '6px 8px',
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-subtle)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-muted)'
              e.currentTarget.style.borderColor = 'var(--sage)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border-light)'
            }}
            title="Buy more days"
          >
            <ShoppingCart size={18} />
          </button>
          <button
            onClick={() => signOut()}
            style={{
              padding: '6px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-subtle)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-color)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-subtle)' }}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

      <div style={{ flex: 1, padding: '24px 32px', maxWidth: '1200px' }}>
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', margin: 0 }}>Profile</h2>
              <button
                onClick={() => {
                  const username = user?.primaryEmailAddress?.emailAddress.split('@')[0] || 'user'
                  const url = `${window.location.origin}/profile/${username}`
                  navigator.clipboard.writeText(url)
                  alert('Profile link copied!')
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: 'var(--text-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-muted)'
                  e.currentTarget.style.borderColor = 'var(--sage)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'var(--border-light)'
                }}
              >
                <Share2 size={16} /> Share Profile
              </button>
            </div>
            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex', gap: '20px', alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Profile"
                    style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'var(--surface-muted)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', fontWeight: 500, color: 'var(--text-subtle)',
                  }}>
                    {user?.firstName?.charAt(0) || '?'}
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: 500 }}>{user?.firstName} {user?.lastName}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Study Activity</h3>
                {activityLoading ? (
                  <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>Loading...</p>
                ) : (
                  <ActivityGrid data={activityData} />
                )}
              </div>
            </div>

            <hr style={{
              border: 'none', borderTop: '1px solid var(--border-light)',
              margin: '32px 0',
            }} />

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Earned Badges</h3>
              {badgesLoading ? (
                <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>Loading...</p>
              ) : (
                <div style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-soft)',
                }}>
                  {(() => {
                    const unlockedBadges = badges.filter(b => b.current >= b.bronze)
                    if (unlockedBadges.length === 0) {
                      return (
                        <p style={{ color: 'var(--text-subtle)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                          Complete activities to earn badges!
                        </p>
                      )
                    }
                    return (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '24px',
                        justifyContent: 'flex-start',
                      }}>
                        {unlockedBadges.map(badge => {
                          const tier = badge.current >= badge.gold ? 'gold' : badge.current >= badge.silver ? 'silver' : 'bronze'
                          const color = tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#C0C0C0' : '#CD7F32'
                          const letter = tier === 'gold' ? 'A' : tier === 'silver' ? 'B' : 'C'
                          return (
                            <div key={badge.id} style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: '80px',
                            }}>
                              <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                border: `3px solid ${color}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                                fontWeight: 700,
                                color: color,
                              }}>
                                {letter}
                              </div>
                              <span style={{
                                fontSize: '12px',
                                color: 'var(--text-subtle)',
                                textAlign: 'center',
                                maxWidth: '80px',
                              }}>
                                {badge.name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <hr style={{
              border: 'none', borderTop: '1px solid var(--border-light)',
              margin: '32px 0',
            }} />

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Badges & Milestones</h3>
              {badgesLoading ? (
                <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>Loading...</p>
              ) : (
                <Badges badges={badges} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'practice' && !practiceSection && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Practice</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '24px',
            }}>
              <div
                onClick={() => setPracticeSection('reading')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ marginBottom: '16px' }}><BookOpen size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>Reading</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Upload PDFs and practice reading comprehension
                </p>
              </div>

              <div
                onClick={() => setPracticeSection('definitions')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
              >
                <div style={{ marginBottom: '16px' }}><BookMarked size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>Definitions</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Match words to their definitions in multiple-choice quizzes
                </p>
              </div>

              <div
                onClick={() => setPracticeSection('transformations')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
              >
                <div style={{ marginBottom: '16px' }}><Shuffle size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>Transformations</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Transform sentences between different tenses
                </p>
              </div>

              <div
                onClick={() => setPracticeSection('listening')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
              >
                <div style={{ marginBottom: '16px' }}><Headphones size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>Listening</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Practice spelling by listening to words
                </p>
              </div>

              <div
                onClick={() => setPracticeSection('phrasal-verbs')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
              >
                <div style={{ marginBottom: '16px' }}><Link size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>Phrasal Verbs</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Type the correct phrasal verb from its definition
                </p>
              </div>

              <div
                onClick={() => setShowOutputInfoModal(true)}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
              >
                <div style={{ marginBottom: '16px' }}><MessageSquareText size={48} color="var(--sage)" /></div>
                <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--sage)' }}>English Output</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  Write freely and get AI feedback on your English level
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'practice' && practiceSection === 'reading' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setPracticeSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Practice
              </button>
              <h2 style={{ fontSize: '32px' }}>Reading</h2>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: dragOver ? 'var(--sage)' : 'var(--card-white)',
                borderRadius: 'var(--radius-md)',
                padding: '48px',
                boxShadow: 'var(--shadow-soft)',
                textAlign: 'center',
                cursor: 'pointer',
                border: `3px dashed ${dragOver ? 'white' : 'var(--olive)'}`,
                transition: 'all 0.2s',
                marginBottom: '24px',
                color: dragOver ? 'white' : 'var(--text-subtle)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {uploading ? (
                <p style={{ fontSize: '16px' }}>Uploading PDF...</p>
              ) : (
                <>
                  <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    {dragOver ? 'Drop your PDF here' : 'Drag & drop a PDF here'}
                  </p>
                  <p style={{ fontSize: '14px', opacity: 0.7 }}>or click to browse</p>
                </>
              )}
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '32px',
              boxShadow: 'var(--shadow-soft)',
            }}>
              <h3 style={{ fontSize: '18px', marginBottom: '20px', color: 'var(--sage)' }}>Your PDFs</h3>

              {practiceLoading ? (
                <p style={{ color: 'var(--text-subtle)' }}>Loading practice...</p>
              ) : practice.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)' }}>No PDFs uploaded yet. Drag and drop one above.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '16px',
                }}>
                  {practice.map((resource) => (
                    <div
                      key={resource.id}
                      style={{
                        background: 'var(--bg-cream)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '20px',
                        cursor: 'pointer',
                        border: '2px solid var(--resource-card-border)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      onClick={() => navigate('/reading/' + resource.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--resource-card-border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        marginBottom: '12px', textAlign: 'center',
                      }}>
                        <FileText size={32} color="var(--sage)" />
                      </div>
                      <p style={{
                        fontWeight: 600, fontSize: '14px', marginBottom: '4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {resource.title}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '12px' }}>
                        {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : ''}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteResource(resource.id);
                        }}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid var(--danger-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--danger-color)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginTop: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <X size={14} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'practice' && practiceSection === 'listening' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setPracticeSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Practice
              </button>
              <h2 style={{ fontSize: '32px' }}>Listening</h2>
            </div>

            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: 'var(--radius-md)',
              padding: '56px 48px',
              boxShadow: 'var(--hero-shadow)',
              textAlign: 'center',
              color: 'white',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30%', left: '-10%', width: '250px', height: '250px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
              }} />
              <div style={{ marginBottom: '20px' }}><Headphones size={72} color="white" /></div>
              <h3 style={{
                fontSize: '30px', marginBottom: '12px',
                fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '-0.5px',
              }}>
                Listening Practice
              </h3>
              <p style={{
                fontSize: '16px', opacity: 0.9, marginBottom: '36px',
                maxWidth: '520px', margin: '0 auto 36px', lineHeight: 1.7,
              }}>
                Train your ear and sharpen your spelling. You'll hear English words spoken aloud — 
                type exactly what you hear before time runs out.
              </p>
              <button
                onClick={() => { setShowListeningModal(true); setListeningRounds(5); }}
                style={{
                    padding: '16px 44px', background: 'var(--hero-btn-bg)', color: 'var(--hero-btn-text)',
                    border: 'none', borderRadius: '50px', fontWeight: 600, cursor: 'pointer',
                    fontSize: '17px', boxShadow: 'var(--hero-btn-shadow)',
                    transition: 'all 0.25s', letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow)';
                }}
              >
                Start Practice
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {[
                { icon: 'Play', title: 'Listen Carefully', desc: 'Each word is spoken with clear, natural pronunciation' },
                { icon: 'Type', title: 'Type It Out', desc: 'Spell the word exactly as you hear it' },
                { icon: '10s', title: 'Beat the Clock', desc: 'You have 10 seconds per word to answer' },
                { icon: '%', title: 'Track Progress', desc: 'See your accuracy score at the end' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-soft)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--sage)' }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'practice' && practiceSection === 'definitions' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setPracticeSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Practice
              </button>
              <h2 style={{ fontSize: '32px' }}>Definitions</h2>
            </div>

            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: 'var(--radius-md)',
              padding: '56px 48px',
              boxShadow: 'var(--hero-shadow)',
              textAlign: 'center',
              color: 'white',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30%', left: '-10%', width: '250px', height: '250px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
              }} />
              <div style={{ marginBottom: '20px' }}><BookMarked size={72} color="white" /></div>
              <h3 style={{
                fontSize: '30px', marginBottom: '12px',
                fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '-0.5px',
              }}>
                Definitions Practice
              </h3>
              <p style={{
                fontSize: '16px', opacity: 0.9, marginBottom: '36px',
                maxWidth: '520px', margin: '0 auto 36px', lineHeight: 1.7,
              }}>
                Test your vocabulary knowledge. Read the definition and pick the correct word from four choices before time runs out.
              </p>
              <button
                onClick={() => { setShowDefinitionsModal(true); setDefinitionsRounds(5); }}
                style={{
                    padding: '16px 44px', background: 'var(--hero-btn-bg)', color: 'var(--hero-btn-text)',
                    border: 'none', borderRadius: '50px', fontWeight: 600, cursor: 'pointer',
                    fontSize: '17px', boxShadow: 'var(--hero-btn-shadow)',
                    transition: 'all 0.25s', letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow)';
                }}
              >
                Start Practice
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {[
                { icon: 'Read', title: 'Read Carefully', desc: 'Each definition is clear and precise' },
                { icon: 'Pick', title: 'Choose Wisely', desc: 'Pick the correct word from four options' },
                { icon: '15s', title: 'Beat the Clock', desc: 'You have 15 seconds per question' },
                { icon: '%', title: 'Track Progress', desc: 'See your accuracy score at the end' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-soft)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--sage)' }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'practice' && practiceSection === 'transformations' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setPracticeSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Practice
              </button>
              <h2 style={{ fontSize: '32px' }}>Transformations</h2>
            </div>

            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: 'var(--radius-md)',
              padding: '56px 48px',
              boxShadow: 'var(--hero-shadow)',
              textAlign: 'center',
              color: 'white',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30%', left: '-10%', width: '250px', height: '250px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
              }} />
              <div style={{ marginBottom: '20px' }}><Shuffle size={72} color="white" /></div>
              <h3 style={{
                fontSize: '30px', marginBottom: '12px',
                fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '-0.5px',
              }}>
                Tense Transformations
              </h3>
              <p style={{
                fontSize: '16px', opacity: 0.9, marginBottom: '36px',
                maxWidth: '520px', margin: '0 auto 36px', lineHeight: 1.7,
              }}>
                Master English tenses. Read a sentence and transform it into the requested tense — past simple, present continuous, present perfect, and more.
              </p>
              <button
                onClick={() => { setShowTransformationsModal(true); setTransformationsRounds(5); }}
                style={{
                    padding: '16px 44px', background: 'var(--hero-btn-bg)', color: 'var(--hero-btn-text)',
                    border: 'none', borderRadius: '50px', fontWeight: 600, cursor: 'pointer',
                    fontSize: '17px', boxShadow: 'var(--hero-btn-shadow)',
                    transition: 'all 0.25s', letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow)';
                }}
              >
                Start Practice
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {[
                { icon: 'Read', title: 'Read the Sentence', desc: 'Start with a clear English sentence in present tense' },
                { icon: 'Goal', title: 'Follow the Target', desc: 'A random tense is chosen for you to transform into' },
                { icon: '20s', title: 'Think Fast', desc: 'You have 20 seconds per transformation' },
                { icon: '%', title: 'Track Progress', desc: 'See your accuracy score at the end' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-soft)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--sage)' }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'practice' && practiceSection === 'phrasal-verbs' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setPracticeSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Practice
              </button>
              <h2 style={{ fontSize: '32px' }}>Phrasal Verbs</h2>
            </div>

            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: 'var(--radius-md)',
              padding: '56px 48px',
              boxShadow: 'var(--hero-shadow)',
              textAlign: 'center',
              color: 'white',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: '-30%', left: '-10%', width: '250px', height: '250px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
              }} />
              <div style={{ marginBottom: '20px' }}><Link size={72} color="white" /></div>
              <h3 style={{
                fontSize: '30px', marginBottom: '12px',
                fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '-0.5px',
              }}>
                Phrasal Verbs Practice
              </h3>
              <p style={{
                fontSize: '16px', opacity: 0.9, marginBottom: '36px',
                maxWidth: '520px', margin: '0 auto 36px', lineHeight: 1.7,
              }}>
                Master English phrasal verbs. Read the definition and the required tense — type the correct phrasal verb before time runs out.
              </p>
              <button
                onClick={() => { setShowPhrasalVerbsModal(true); setPhrasalVerbsRounds(5); }}
                style={{
                    padding: '16px 44px', background: 'var(--hero-btn-bg)', color: 'var(--hero-btn-text)',
                    border: 'none', borderRadius: '50px', fontWeight: 600, cursor: 'pointer',
                    fontSize: '17px', boxShadow: 'var(--hero-btn-shadow)',
                    transition: 'all 0.25s', letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--hero-btn-shadow)';
                }}
              >
                Start Practice
              </button>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}>
              {[
                { icon: 'Clue', title: 'Read the Clue', desc: 'Each card shows a clear definition and the required tense' },
                { icon: 'Type', title: 'Type Your Answer', desc: 'Type the correct phrasal verb — spelling matters!' },
                { icon: '10s', title: 'Beat the Clock', desc: 'You have 10 seconds per question' },
                { icon: '%', title: 'Track Progress', desc: 'See your accuracy score at the end' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-soft)',
                  border: '1px solid var(--border-light)',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', marginBottom: '6px', color: 'var(--sage)' }}>{item.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'progress' && !progressView && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Progress</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '24px' }}>
              <div
                onClick={() => setProgressView('words')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--resource-card-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <BookMarked size={32} style={{ color: 'var(--sage)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Words Learned</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  {vocabLoading ? 'Loading...' : `${vocabularyWords.length} words`}
                </p>
              </div>

              <div
                onClick={() => setProgressView('output')}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 24px',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: '2px solid var(--resource-card-border)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--resource-card-border-hover)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--resource-card-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <MessageSquareText size={32} style={{ color: 'var(--sage)', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>English Output</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>
                  {outputHistoryLoading ? 'Loading...' : `${outputHistory.length} submissions`}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && progressView === 'words' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button onClick={() => setProgressView(null)} style={{
                padding: '8px 12px', background: 'transparent', border: '1px solid var(--olive)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-primary)',
              }}>
                <ArrowLeft size={16} />
                Back
              </button>
              <h2 style={{ fontSize: '32px' }}>Words Learned</h2>
              <span style={{ fontSize: '14px', color: 'var(--text-subtle)', background: 'var(--surface-muted)', padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}>
                {vocabularyWords.length} words
              </span>
            </div>
            <div style={{
              background: '#0f0f0f',
              border: '1px solid var(--olive)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              fontSize: '14px',
              lineHeight: '1.8',
              maxHeight: '60vh',
              overflowY: 'auto',
              color: '#e4e4e7',
            }}>
              {vocabularyWords.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)', fontFamily: 'var(--font-body)' }}>No words learned yet. Open a PDF and click on words to add them.</p>
              ) : (
                vocabularyWords.map((word) => (
                  <div key={word} style={{ padding: '2px 0' }}>{word}</div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'progress' && progressView === 'output' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button onClick={() => setProgressView(null)} style={{
                padding: '8px 12px', background: 'transparent', border: '1px solid var(--olive)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-primary)',
              }}>
                <ArrowLeft size={16} />
                Back
              </button>
              <h2 style={{ fontSize: '32px' }}>English Output</h2>
            </div>

            {outputHistoryLoading ? (
              <p style={{ color: 'var(--text-subtle)' }}>Loading...</p>
            ) : outputHistory.length === 0 ? (
              <div style={{
                background: 'var(--card-white)',
                borderRadius: 'var(--radius-md)',
                padding: '48px',
                boxShadow: 'var(--shadow-soft)',
                textAlign: 'center',
                border: '2px dashed var(--border-light)',
              }}>
                <p style={{ fontSize: '15px', color: 'var(--text-subtle)' }}>
                  No submissions yet. Complete an English Output exercise to see your history.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {outputHistory.map((item) => (
                  <div key={item.id} style={{
                    background: 'var(--card-white)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px 24px',
                    boxShadow: 'var(--shadow-soft)',
                    borderLeft: '4px solid var(--sage)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '12px' }}>
                          {item.question}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                          {new Date(item.completedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div style={{
                        padding: '8px 16px',
                        background: item.level.startsWith('C') ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                          item.level.startsWith('B') ? 'linear-gradient(135deg, #C0C0C0, #A0A0A0)' :
                            'linear-gradient(135deg, #CD7F32, #A0522D)',
                        borderRadius: '20px',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}>
                        {item.level}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '4px' }}>Book a Class</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px' }}>
              Follow the steps to schedule your session
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '32px',
            }}>
              {[1, 2, 3].map((step) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: bookingStep >= step ? 'var(--sage-gradient)' : 'var(--olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: bookingStep >= step ? 'white' : 'var(--text-subtle)',
                    transition: 'all 0.3s ease',
                  }}>
                    {bookingStep > step ? <Check size={16} /> : step}
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: bookingStep >= step ? 'var(--text-primary)' : 'var(--text-subtle)',
                  }}>
                    {step === 1 ? 'Teacher' : step === 2 ? 'Date' : 'Time'}
                  </span>
                  {step < 3 && (
                    <ChevronRight size={16} style={{ color: 'var(--text-subtle)', marginLeft: '4px' }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              marginBottom: '20px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {bookingStep === 1 && <><User size={18} /> Select Teacher</>}
                  {bookingStep === 2 && <><Calendar size={18} /> Choose Date</>}
                  {bookingStep === 3 && <><Clock size={18} /> Pick Time</>}
                </h3>
                {teacherFilter && bookingStep === 1 && (
                  <button
                    onClick={() => { setTeacherFilter(null); setSelectedTeacher(null); setSelectedDate(null); setSelectedTime(null); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--sage)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <X size={14} /> Clear filter
                  </button>
                )}
              </div>

              {bookingStep === 1 && (
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  marginBottom: '4px',
                }}>
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.clerkId}
                      onClick={() => {
                        setSelectedTeacher(teacher.clerkId);
                        setTeacherFilter(teacher.clerkId);
                        setBookingStep(2);
                        setSelectedDate(null);
                        setSelectedTime(null);
                      }}
                      style={{
                        minWidth: '220px',
                        background: selectedTeacher === teacher.clerkId ? 'rgba(156, 175, 139, 0.15)' : 'var(--bg-cream)',
                        border: `2px solid ${selectedTeacher === teacher.clerkId ? 'var(--sage)' : 'transparent'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedTeacher !== teacher.clerkId) {
                          e.currentTarget.style.borderColor = 'var(--olive)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedTeacher !== teacher.clerkId) {
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {selectedTeacher === teacher.clerkId && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--sage-gradient)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={14} color="white" />
                        </div>
                      )}
                      <img
                        src={teacher.image}
                        alt={teacher.name}
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginBottom: '12px',
                          border: '2px solid var(--olive)',
                        }}
                      />
                      <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{teacher.name}</h4>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'var(--olive)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}>
                        {teacher.specialty}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {bookingStep === 2 && (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    {generateNextDays(14).map((date) => {
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = date.getDate();
                      const month = date.toLocaleDateString('en-US', { month: 'short' });
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
                      const filteredTeachers = teachers.filter(t =>
                        !teacherFilter || t.clerkId === teacherFilter
                      );
                      const hasAvailability = filteredTeachers.some(t => t.availability[dayOfWeek]);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            if (hasAvailability) {
                              setSelectedDate(date);
                              setSelectedTime(null);
                              setBookingStep(3);
                            }
                          }}
                          disabled={!hasAvailability}
                          style={{
                            padding: '12px 8px',
                            background: isSelected ? 'var(--sage-gradient)' : 'var(--bg-cream)',
                            border: `2px solid ${isSelected ? 'transparent' : isToday ? 'var(--sage)' : 'transparent'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: hasAvailability ? 'pointer' : 'not-allowed',
                            opacity: hasAvailability ? 1 : 0.35,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 500, color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--text-subtle)' }}>
                            {dayName}
                          </span>
                          <span style={{ fontSize: '20px', fontWeight: 700, color: isSelected ? 'white' : 'var(--text-primary)' }}>
                            {dayNum}
                          </span>
                          <span style={{ fontSize: '10px', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-subtle)' }}>
                            {month}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setBookingStep(1)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowLeft size={14} /> Back to teachers
                  </button>
                </>
              )}

              {bookingStep === 3 && selectedDate && (
                <>
                  <div style={{
                    background: 'var(--olive)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Selected Date</p>
                      <p style={{ fontSize: '16px', fontWeight: 600 }}>
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => setBookingStep(2)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--text-subtle)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Change
                    </button>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    {(teacherFilter ? teachers.filter(t => t.clerkId === teacherFilter) : teachers).map((teacher) => {
                      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
                      const [startHour] = teacher.availability[dayOfWeek] || [];
                      if (!startHour) return null;
                      const [endHour] = teacher.availability[dayOfWeek]?.slice(1) || [startHour + 3];
                      const timeSlots = generateTimeSlots(startHour, endHour);

                      return (
                        <div key={teacher.clerkId} style={{ marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <img
                              src={teacher.image}
                              alt={teacher.name}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{teacher.name}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', paddingLeft: '36px' }}>
                            {timeSlots.map((slot) => {
                              const isPast = isTimeSlotPast(selectedDate, slot);
                              const isSelected = selectedTime === slot && selectedTeacher === teacher.clerkId;

                              return (
                                <button
                                  key={`${teacher.clerkId}-${slot}`}
                                  onClick={() => {
                                    if (!isPast) {
                                      setSelectedTeacher(teacher.clerkId);
                                      setSelectedTime(slot);
                                    }
                                  }}
                                  disabled={isPast}
                                  style={{
                                    padding: '12px 10px',
                                    background: isSelected ? 'var(--sage-gradient)' : isPast ? 'rgba(255,255,255,0.03)' : 'var(--bg-cream)',
                                    border: `2px solid ${isSelected ? 'transparent' : isPast ? 'rgba(255,255,255,0.05)' : 'transparent'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: isPast ? 'not-allowed' : 'pointer',
                                    opacity: isPast ? 0.4 : 1,
                                    transition: 'all 0.2s ease',
                                    fontSize: '13px',
                                    fontWeight: isSelected ? 600 : 500,
                                    color: isSelected ? 'white' : isPast ? 'var(--text-subtle)' : 'var(--text-primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  <span>{slot}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.8 }}>1 hour</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setBookingStep(2)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-subtle)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowLeft size={14} /> Change date
                  </button>
                </>
              )}
            </div>

            {selectedTeacher && selectedDate && selectedTime && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(156, 175, 139, 0.2) 0%, rgba(156, 175, 139, 0.1) 100%)',
                border: '1px solid var(--sage)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--sage-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={24} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '2px' }}>Ready to book</p>
                    <p style={{ fontSize: '15px', fontWeight: 600 }}>
                      {teachers.find(t => t.clerkId === selectedTeacher)?.name} &middot; {selectedTime} &middot; 1 hour &middot; {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={confirmBooking}
                  style={{
                    padding: '14px 32px',
                    background: 'var(--sage-gradient)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(107, 127, 103, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(107, 127, 103, 0.4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(107, 127, 103, 0.3)'; }}
                >
                  Confirm Booking <ChevronRight size={18} />
                </button>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '28px',
              marginBottom: '16px',
            }}>
              <Star size={18} style={{ color: 'var(--sage)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Our Teachers</h3>
              {teacherFilter && (
                <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>(filtered)</span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
              marginBottom: '40px',
            }}>
              {teachers.map((teacher) => (
                <div
                  key={teacher.clerkId}
                  onClick={() => {
                    setTeacherFilter(teacher.clerkId);
                    setSelectedTeacher(teacher.clerkId);
                    setBookingStep(2);
                    setSelectedDate(null);
                    setSelectedTime(null);
                  }}
                  style={{
                    background: 'var(--card-white)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    border: teacherFilter === teacher.clerkId ? '2px solid var(--sage)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (teacherFilter !== teacher.clerkId) {
                      e.currentTarget.style.borderColor = 'var(--olive)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (teacherFilter !== teacher.clerkId) {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '2px solid var(--olive)',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{teacher.name}</h4>
                      {teacherFilter === teacher.clerkId && (
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--sage-gradient)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Check size={12} color="white" />
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      background: 'var(--olive)',
                      borderRadius: '10px',
                      color: 'var(--text-primary)',
                      fontWeight: 500,
                      display: 'inline-block',
                      marginBottom: '8px',
                    }}>
                      {teacher.specialty}
                    </span>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>
                      {teacher.description}
                    </p>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {Object.keys(teacher.availability).map((day) => (
                        <span key={day} style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: 'var(--bg-cream)',
                          borderRadius: '4px',
                          color: 'var(--text-subtle)',
                        }}>
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{
              fontSize: '18px', fontWeight: 600, marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Video size={18} /> Upcoming Sessions
            </h3>

            {bookedSessions.length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: '14px', marginBottom: '40px' }}>
                No upcoming sessions. Book your first class above!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                {bookedSessions.map((session: any, i: number) => {
                  const sessionDate = new Date(session.sessionDatetime);
                  const day = sessionDate.getDate();
                  const month = sessionDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const time = sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const fullDate = sessionDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                  const isConfirmed = session.status === 'confirmed';

                  return (
                    <div key={i} style={{
                      background: 'var(--card-white)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 20px',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      border: isConfirmed ? '1px solid var(--sage)' : '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <div style={{
                        width: '52px', height: '60px',
                        background: isConfirmed ? 'var(--sage-gradient)' : 'var(--olive)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: 'white', lineHeight: 1 }}>
                          {day}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'white', opacity: 0.9 }}>
                          {month}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px', color: 'var(--text-primary)' }}>
                          {session.topic}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginBottom: '2px' }}>
                          with {session.teacherName}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--sage)', fontWeight: 500 }}>
                          {time} &middot; {fullDate}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                          background: isConfirmed ? 'rgba(156, 175, 139, 0.2)' : 'rgba(255, 235, 59, 0.15)',
                          color: isConfirmed ? 'var(--sage)' : '#FFD54F',
                        }}>
                          {isConfirmed ? 'Confirmed' : 'Pending'}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sage)' }}>
                          ${session.price || 50}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'exam' && (
          <div>
            <div style={{
              background: 'var(--sage-gradient)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 48px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                borderRadius: '50%',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Professional Certification
                  </span>
                </div>
                  <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'white', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>
                    SHAKESPEARE Academic Test
                  </h2>
                  <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.95)', marginBottom: '24px', maxWidth: '600px' }}>
                    Comprehensive English proficiency assessment covering all key language skills with instant feedback and official certification.
                  </p>
                <div style={{ display: 'flex', gap: '32px' }}>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>4</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Sections</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>2h 45m</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Duration</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: 'white' }}>
                      {userCefrLevel || 'Band 9'}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {userCefrLevel ? 'Your Level' : 'Scoring'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
              marginBottom: '32px',
            }}>
              {[
                { icon: BookOpen, name: 'Reading', desc: '60 minutes' },
                { icon: Headphones, name: 'Listening', desc: '30 minutes' },
                { icon: FileText, name: 'Writing', desc: '60 minutes' },
                { icon: MessageSquareText, name: 'Speaking', desc: '11-14 minutes' },
              ].map((section, i) => (
                <div key={section.name} style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 20px',
                  boxShadow: 'var(--shadow-soft)',
                  textAlign: 'center',
                  borderTop: '3px solid var(--sage)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <section.icon size={24} color="var(--sage)" />
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>{section.name}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>{section.desc}</p>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '24px',
              marginBottom: '32px',
            }}>
              <div style={{
                background: 'var(--card-white)',
                borderRadius: 'var(--radius-md)',
                padding: '32px',
                boxShadow: 'var(--shadow-soft)',
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
                  What You'll Experience
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { icon: GraduationCap, title: 'Expert-Designed Questions', desc: 'Questions crafted by certified IELTS instructors matching official test standards' },
                    { icon: Clock3, title: 'Real Exam Conditions', desc: 'Timed sections that simulate the actual test environment and pacing' },
                    { icon: FileCheck, title: 'Instant Feedback', desc: 'Get your scores immediately after completing each section' },
                    { icon: Award, title: 'Official Certificate', desc: 'Receive a certificate upon successful completion to showcase your skills' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <item.icon size={20} color="var(--sage)" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{item.title}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', lineHeight: 1.5 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, var(--sage) 0%, var(--sage-light) 100%)',
                borderRadius: 'var(--radius-md)',
                padding: '32px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>One-time payment</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 700, color: 'white' }}>$60</span>
                  <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>USD</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>per exam attempt</p>
                <button
                  onClick={async () => {
                    if (!user) return;
                    try {
                      const token = await getToken();
                      const priceId = import.meta.env.VITE_STRIPE_PRICE_EXAM;
                      if (!priceId) {
                        console.error('Exam price ID not configured');
                        return;
                      }
                      const res = await fetch('/api/subscription/create-exam-checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ price_id: priceId }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.url) {
                          window.location.href = data.url;
                        }
                      } else {
                        console.error('Failed to create exam checkout');
                      }
                    } catch (err) {
                      console.error('Error during exam checkout:', err);
                    }
                  }}
                  style={{
                    padding: '14px 32px',
                    background: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--sage)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Start Exam
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, var(--sage) 0%, #4a5a47 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '48px 40px',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: '-30%',
                right: '-5%',
                width: '250px',
                height: '250px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                borderRadius: '50%',
              }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
                <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'white', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>
                  Master English with AI-Powered Practice
                </h2>
                <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.95)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Shakespeare transforms how you learn English. Practice reading, listening, vocabulary, and writing with instant AI feedback that tells you exactly your CEFR level — from beginner to fluent.
                </p>
                <button
                  onClick={() => setActiveTab('practice')}
                  style={{
                    padding: '14px 32px',
                    background: 'white',
                    color: 'var(--sage)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  Start Practicing Free
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-primary)' }}>
                Why Choose Shakespeare?
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {[
                  {
                    icon: Sparkles,
                    title: 'AI-Powered Feedback',
                    desc: 'Get instant, detailed feedback on your writing and speaking. Know your exact CEFR level (A1-C2) with specific improvements.',
                  },
                  {
                    icon: GraduationCap,
                    title: 'Expert-Verified Content',
                    desc: 'Questions designed by certified language instructors matching international English test standards.',
                  },
                  {
                    icon: BarChart3,
                    title: 'Track Your Progress',
                    desc: 'Watch your vocabulary grow, badges accumulate, and your English level improve over time.',
                  },
                  {
                    icon: Clock3,
                    title: 'Learn at Your Pace',
                    desc: 'No pressure, no schedules. Practice for 5 minutes or 2 hours — whenever and wherever works for you.',
                  },
                  {
                    icon: FileCheck,
                    title: 'Real Exam Preparation',
                    desc: 'Simulate real test conditions with our SHAKESPEARE Academic Test — get a certificate upon completion.',
                  },
                  {
                    icon: Users,
                    title: 'Book Expert Sessions',
                    desc: 'Schedule 1-on-1 sessions with certified English teachers to accelerate your learning.',
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--card-white)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px 24px',
                    boxShadow: 'var(--shadow-soft)',
                    borderTop: '3px solid var(--sage)',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'var(--surface-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                    }}>
                      <item.icon size={24} color="var(--sage)" />
                    </div>
                    <h4 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{item.title}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-subtle)', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: 'var(--card-white)',
              borderRadius: 'var(--radius-md)',
              padding: '40px',
              boxShadow: 'var(--shadow-soft)',
              marginBottom: '32px',
            }}>
              <h3 style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-primary)' }}>
                What Our Learners Say
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {[
                  {
                    name: 'María G.',
                    role: 'Spanish Speaker',
                    text: 'After 3 months using Shakespeare, I went from B1 to B2. The AI feedback was like having a personal tutor available 24/7.',
                  },
                  {
                    name: 'Takeshi Y.',
                    role: 'Japanese Speaker',
                    text: 'The phrasal verbs section is incredible. I finally understand how to use "get" in different contexts. My writing improved dramatically.',
                  },
                  {
                    name: 'Ahmed K.',
                    role: 'Arabic Speaker',
                    text: 'I was skeptical about AI feedback, but the CEFR evaluation was spot-on. It knew exactly what to correct in my essay.',
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--surface-muted)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    borderLeft: '4px solid var(--sage)',
                  }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="var(--sage)" color="var(--sage)" />)}
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '16px' }}>
                      "{item.text}"
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{item.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--sage) 0%, #4a5a47 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '40px',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
                Ready to Improve Your English?
              </h3>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', marginBottom: '24px' }}>
                Join thousands of learners who are mastering English with Shakespeare.
              </p>
              <button
                onClick={() => setActiveTab('practice')}
                style={{
                  padding: '14px 32px',
                  background: 'white',
                  color: 'var(--sage)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Start Now — It's Free
              </button>
            </div>
          </div>
        )}

        </div>

        {showListeningModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '44px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'center', maxWidth: '400px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
              }}>
                <Headphones size={28} color="white" />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Listening Practice
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                How many words would you like to practice?
              </p>
              <input
                type="number"
                min={1}
                max={98}
                value={listeningRounds}
                onChange={(e) => setListeningRounds(Math.min(98, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)', fontSize: '28px', textAlign: 'center',
                  background: 'var(--bg-cream)', outline: 'none', marginBottom: '28px',
                  fontWeight: 700, color: 'var(--sage)', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowListeningModal(false)}
                  style={{
                    flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowListeningModal(false);
                    navigate('/listening?rounds=' + listeningRounds);
                  }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: 'pointer', fontSize: '15px',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}
        {showDefinitionsModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '44px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'center', maxWidth: '400px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
              }}>
                <BookMarked size={28} color="white" />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Definitions Practice
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                How many questions would you like to answer?
              </p>
              <input
                type="number"
                min={1}
                max={100}
                value={definitionsRounds}
                onChange={(e) => setDefinitionsRounds(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)', fontSize: '28px', textAlign: 'center',
                  background: 'var(--bg-cream)', outline: 'none', marginBottom: '28px',
                  fontWeight: 700, color: 'var(--sage)', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowDefinitionsModal(false)}
                  style={{
                    flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDefinitionsModal(false);
                    navigate('/definitions?rounds=' + definitionsRounds);
                  }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: 'pointer', fontSize: '15px',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}
        {showPhrasalVerbsModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '44px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'center', maxWidth: '400px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
              }}>
                <Link size={28} color="white" />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Phrasal Verbs Practice
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                How many questions would you like to answer?
              </p>
              <input
                type="number"
                min={1}
                max={100}
                value={phrasalVerbsRounds}
                onChange={(e) => setPhrasalVerbsRounds(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)', fontSize: '28px', textAlign: 'center',
                  background: 'var(--bg-cream)', outline: 'none', marginBottom: '28px',
                  fontWeight: 700, color: 'var(--sage)', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPhrasalVerbsModal(false)}
                  style={{
                    flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPhrasalVerbsModal(false);
                    navigate('/phrasal-verbs?rounds=' + phrasalVerbsRounds);
                  }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: 'pointer', fontSize: '15px',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}
        {showTransformationsModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '44px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'center', maxWidth: '400px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
              }}>
                <Shuffle size={28} color="white" />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Tense Transformations
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                How many transformations would you like to practice?
              </p>
              <input
                type="number"
                min={1}
                max={100}
                value={transformationsRounds}
                onChange={(e) => setTransformationsRounds(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{
                  width: '100%', padding: '14px 16px', border: '2px solid var(--olive)',
                  borderRadius: 'var(--radius-sm)', fontSize: '28px', textAlign: 'center',
                  background: 'var(--bg-cream)', outline: 'none', marginBottom: '28px',
                  fontWeight: 700, color: 'var(--sage)', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--sage)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--olive)'}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowTransformationsModal(false)}
                  style={{
                    flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '15px', fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowTransformationsModal(false);
                    navigate('/transformations?rounds=' + transformationsRounds);
                  }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: 'pointer', fontSize: '15px',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                  }}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        )}

        {showOutputInfoModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'left', maxWidth: '500px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'var(--sage-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
                }}>
                  <MessageSquareText size={24} color="white" />
                </div>
                <button
                  onClick={() => setShowOutputInfoModal(false)}
                  style={{
                    padding: '8px', background: 'transparent', border: 'none',
                    cursor: 'pointer', color: 'var(--text-subtle)',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                English Output
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginBottom: '20px', lineHeight: 1.6 }}>
                Practice free writing and get honest AI feedback on your English level.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  How it works:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--sage)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>1</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>You get a random question or topic</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--sage)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>2</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>Write your answer freely or speak it (voice-to-text)</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--sage)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>3</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>Get AI feedback with your estimated CEFR level</p>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface-muted)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  How you're evaluated:
                </h4>
                <ul style={{ fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.7, paddingLeft: '16px', margin: 0 }}>
                  <li>Grammar accuracy & complexity</li>
                  <li>Vocabulary range & richness</li>
                  <li>Coherence & fluency</li>
                  <li>How well you addressed the question</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowOutputInfoModal(false)}
                  style={{
                    flex: 1, padding: '14px', background: 'transparent', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                    transition: 'all 0.2s', color: 'var(--text-subtle)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowOutputInfoModal(false);
                    navigate('/output');
                  }}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'var(--sage-gradient)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                    transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                  }}
                >
                  Start Writing
                </button>
              </div>
            </div>
          </div>
        )}

        {showRequestConfirm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: 'var(--card-white)', borderRadius: 'var(--radius-md)',
              padding: '44px 40px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              textAlign: 'center', maxWidth: '420px', width: '90%',
              animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--sage-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(107, 127, 103, 0.3)',
              }}>
                <Calendar size={28} color="white" />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Session Booked!
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                Your class has been booked for <strong>$50</strong>. The teacher will confirm the session shortly.
              </p>
              <button
                onClick={() => setShowRequestConfirm(false)}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--sage-gradient)',
                  color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '15px',
                  boxShadow: '0 4px 16px rgba(107,127,103,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(107,127,103,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,127,103,0.3)';
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}