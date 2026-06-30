import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useAuth, SignOutButton } from '@clerk/react';
import { 
  User, FolderOpen, Info, BookOpen, BookMarked, Shuffle, Headphones, Link, 
  ArrowLeft, Moon, Sun, FileText, X, BarChart3, ArrowLeftCircle, Calendar, Clock, Video, CheckCircle
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import ActivityGrid from '../components/ActivityGrid';
import Badges from '../components/Badges';

type Tab = 'profile' | 'resources' | 'progress' | 'about' | 'schedule';

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [resourceSection, setResourceSection] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
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
  const [activityData, setActivityData] = useState<{ date: string; count: number }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [progressView, setProgressView] = useState<string | null>(null);
  const [vocabularyWords, setVocabularyWords] = useState<string[]>([]);
  const [vocabLoading, setVocabLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login');
    }
  }, [isLoaded, user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'resources') {
      setActiveTab('resources');
    }
  }, [searchParams]);

  const fetchResources = async () => {
    if (!user) return;
    setResourcesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/resources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Failed to fetch resources:', res.status, res.statusText);
        setResources([]);
        return;
      }
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setResources([]);
    } finally {
      setResourcesLoading(false);
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

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchVocabulary();
    }
  }, [activeTab, user, fetchVocabulary]);

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchActivityData();
      fetchBadges();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (user && activeTab === 'resources' && resourceSection === 'reading') {
      fetchResources();
    }
  }, [user, activeTab, resourceSection]);

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
        setResources((prev) => prev.filter((r) => r.id !== id));
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
          {([['profile', User], ['resources', FolderOpen], ['progress', BarChart3], ['schedule', Calendar], ['about', Info]] as [Tab, any][]).map(([tab, Icon]) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setResourceSection(null); setProgressView(null); }}
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
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textTransform: 'capitalize',
              }}
            >
              <Icon size={18} />
              {tab}
            </button>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--sidebar-border)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-subtle)', marginBottom: '4px' }}>{user?.primaryEmailAddress?.emailAddress}</p>
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
          transition: 'background 0.3s ease',
        }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '18px',
              color: 'var(--text-primary)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--olive)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>{user?.firstName} {user?.lastName}</span>
          <SignOutButton>
            <button style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-light)',
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
              display: 'flex', gap: '32px', alignItems: 'flex-start',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt="Profile"
                    style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '96px', height: '96px', borderRadius: '50%',
                    background: 'var(--surface-muted)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '36px', fontWeight: 500, color: 'var(--text-subtle)',
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
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Badges & Milestones</h3>
              {badgesLoading ? (
                <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>Loading...</p>
              ) : (
                <Badges badges={badges} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'resources' && !resourceSection && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '32px' }}>Resources</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '24px',
            }}>
              <div
                onClick={() => setResourceSection('reading')}
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
                onClick={() => setResourceSection('definitions')}
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
                onClick={() => setResourceSection('transformations')}
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
                onClick={() => setResourceSection('listening')}
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
                onClick={() => setResourceSection('phrasal-verbs')}
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
            </div>
          </div>
        )}

        {activeTab === 'resources' && resourceSection === 'reading' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setResourceSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Resources
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

              {resourcesLoading ? (
                <p style={{ color: 'var(--text-subtle)' }}>Loading resources...</p>
              ) : resources.length === 0 ? (
                <p style={{ color: 'var(--text-subtle)' }}>No PDFs uploaded yet. Drag and drop one above.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '16px',
                }}>
                  {resources.map((resource) => (
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

        {activeTab === 'resources' && resourceSection === 'listening' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setResourceSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Resources
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

        {activeTab === 'resources' && resourceSection === 'definitions' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setResourceSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Resources
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

        {activeTab === 'resources' && resourceSection === 'transformations' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setResourceSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Resources
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

        {activeTab === 'resources' && resourceSection === 'phrasal-verbs' && (
          <div style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <button
                onClick={() => setResourceSection(null)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ArrowLeft size={18} /> All Resources
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

        {activeTab === 'schedule' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '12px' }}>Book a Class</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '32px' }}>
              Select a teacher and schedule your next session
            </p>

            {([
              { name: 'Cesar Santiago', image: '/teachers/Cesar Santiago.jpg', specialty: 'Conversation & Business', description: 'Native English speaker with 8+ years of experience teaching conversation and business English. Specializes in helping students gain confidence in real-world speaking situations.', availability: ['Monday 2:00 - 5:00 PM', 'Wednesday 2:00 - 5:00 PM', 'Friday 2:00 - 5:00 PM'] },
              { name: 'Roberto Lopez', image: '/teachers/Roberto Lopez.png', specialty: 'Grammar & Exam Prep', description: 'Certified ESL teacher specializing in grammar, pronunciation, and exam preparation (IELTS/TOEFL). His structured approach helps students master the building blocks of English.', availability: ['Tuesday 1:00 - 4:00 PM', 'Thursday 1:00 - 4:00 PM', 'Saturday 10:00 AM - 1:00 PM'] },
            ] as const).map(teacher => (
              <div
                key={teacher.name}
                onClick={() => setSelectedTeacher(selectedTeacher === teacher.name ? null : teacher.name)}
                style={{
                  background: 'var(--card-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-soft)',
                  marginBottom: '16px',
                  border: selectedTeacher === teacher.name ? '2px solid var(--sage)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: '24px',
                  alignItems: 'flex-start',
                }}
                onMouseEnter={(e) => { if (selectedTeacher !== teacher.name) e.currentTarget.style.borderColor = 'var(--olive)'; }}
                onMouseLeave={(e) => { if (selectedTeacher !== teacher.name) e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <img
                  src={teacher.image}
                  alt={teacher.name}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{teacher.name}</h3>
                    <span style={{
                      padding: '3px 10px', background: 'var(--olive)',
                      borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}>{teacher.specialty}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-subtle)', lineHeight: 1.6 }}>
                    {teacher.description}
                  </p>

                  {selectedTeacher === teacher.name && (
                    <div style={{
                      marginTop: '20px', paddingTop: '20px',
                      borderTop: '1px solid var(--border-light)',
                    }}>
                      <h4 style={{
                        fontSize: '14px', fontWeight: 600, marginBottom: '12px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <Clock size={14} /> Available Slots
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {teacher.availability.map(slot => (
                          <div key={slot} style={{
                            padding: '10px 16px', background: 'var(--bg-cream)',
                            borderRadius: 'var(--radius-sm)', fontSize: '14px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span>{slot}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowRequestConfirm(true); }}
                              style={{
                                padding: '6px 16px', background: 'var(--sage-gradient)',
                                color: 'white', border: 'none', borderRadius: '20px',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Request
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <h3 style={{
              fontSize: '20px', fontWeight: 600, marginTop: '48px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Video size={20} /> Upcoming Sessions
            </h3>

            {[
              { teacher: 'Cesar Santiago', date: 'Jul 1, 2026', time: '3:00 PM', topic: 'Business English: Meetings & Negotiations', status: 'confirmed' },
              { teacher: 'Roberto Lopez', date: 'Jul 3, 2026', time: '2:00 PM', topic: 'IELTS Speaking Practice', status: 'confirmed' },
              { teacher: 'Cesar Santiago', date: 'Jul 8, 2026', time: '4:00 PM', topic: 'Conversation: Travel Experiences', status: 'pending' },
            ].length === 0 ? (
              <p style={{ color: 'var(--text-subtle)', fontSize: '14px' }}>No upcoming sessions. Request a class above!</p>
            ) : (
              <div style={{
                background: 'var(--card-white)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                boxShadow: 'var(--shadow-soft)',
              }}>
                {[
                  { teacher: 'Cesar Santiago', date: 'Jul 1, 2026', time: '3:00 PM', topic: 'Business English: Meetings & Negotiations', status: 'confirmed' },
                  { teacher: 'Roberto Lopez', date: 'Jul 3, 2026', time: '2:00 PM', topic: 'IELTS Speaking Practice', status: 'confirmed' },
                  { teacher: 'Cesar Santiago', date: 'Jul 8, 2026', time: '4:00 PM', topic: 'Conversation: Travel Experiences', status: 'pending' },
                ].map((session, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px', background: 'var(--bg-cream)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: session.status === 'confirmed' ? 'var(--sage-gradient)' : 'var(--surface-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {session.status === 'confirmed' ? <CheckCircle size={20} color="white" /> : <Clock size={20} color="var(--text-subtle)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{session.topic}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>
                        {session.teacher} &middot; {session.date} at {session.time}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                      background: session.status === 'confirmed' ? 'var(--olive)' : 'var(--surface-muted)',
                      color: session.status === 'confirmed' ? 'var(--text-primary)' : 'var(--text-subtle)',
                    }}>
                      {session.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                    </span>
                    {session.status === 'confirmed' && (
                      <button style={{
                        padding: '8px 16px', background: 'var(--sage-gradient)',
                        color: 'white', border: 'none', borderRadius: '20px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <Video size={14} /> Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
              <h3 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--sage)' }}>Welcome</h3>
              <p style={{ lineHeight: 1.8, marginBottom: '16px' }}>
                Shakespeare is a platform for improving your English skills through reading and listening practice.
              </p>
              <p style={{ lineHeight: 1.8, color: 'var(--text-subtle)' }}>
                Upload PDFs to practice reading comprehension, and use the listening exercises to sharpen your spelling.
              </p>
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
                Request Sent!
              </h3>
              <p style={{ fontSize: '15px', color: 'var(--text-subtle)', marginBottom: '28px', lineHeight: 1.5 }}>
                Your class request has been submitted. The teacher will confirm the session shortly.
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