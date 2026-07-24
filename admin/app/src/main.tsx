import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ClerkProvider, useAuth, useUser } from '@clerk/react';
import {
  Users, BarChart3, CreditCard, Activity, Loader2, CheckCircle, XCircle,
  Search, Plus, Tag, Gift, Calendar, TrendingUp, Clock, Mail, Shield,
  ChevronRight, X, Edit2, Trash2, Copy, Eye, TrendingDown, AlertCircle
} from 'lucide-react';
import './styles/globals.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface User {
  _id: string
  clerkId: string
  email: string
  name: string
  role: string
  days_left: number
  subscription_end: string | null
  subscription_status: string
  subscription_start: string | null
  createdAt: string
  last_payment_date: string | null
  stripe_customer_id: string | null
}

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  totalRevenue: number
  trialUsers: number
  pastDueUsers: number
  newUsersThisMonth: number
}

interface Offer {
  id: string
  code: string
  discount: number
  type: 'percentage' | 'fixed'
  description: string
  active: boolean
  createdAt: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount / 100);
}

function StatCard({ icon: Icon, label, value, subtext, color, trend }: {
  icon: any, label: string, value: string | number, subtext?: string, color: string, trend?: 'up' | 'down'
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '20', color }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <h4>{label}</h4>
        <div className="stat-value-row">
          <p className="stat-value">{value}</p>
          {trend && (
            <span className={`trend ${trend}`}>
              {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
          )}
        </div>
        {subtext && <p className="stat-subtext">{subtext}</p>}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0, trialUsers: 0, pastDueUsers: 0, newUsersThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [getToken]);

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="spin" size={40} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="welcome-banner">
        <div>
          <h2>Welcome back, {user?.firstName || 'Admin'}</h2>
          <p>Here's what's happening with your platform today.</p>
        </div>
        <div className="header-actions">
          <a href="/users" className="btn btn-primary">
            <Users size={18} /> View All Users
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#6B7F67" trend="up" subtext="Registered users" />
        <StatCard icon={Activity} label="Active Subscriptions" value={stats.activeSubscriptions} color="#4CAF50" subtext="Paying customers" />
        <StatCard icon={CreditCard} label="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="#2196F3" trend="up" />
        <StatCard icon={AlertCircle} label="Trial Users" value={stats.trialUsers} color="#FF9800" subtext="On free trial" />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <a href="/users" className="quick-action">
              <div className="quick-action-icon"><Users size={20} /></div>
              <div>
                <h4>Manage Users</h4>
                <p>View and edit user accounts</p>
              </div>
              <ChevronRight size={18} />
            </a>
            <a href="/offers" className="quick-action">
              <div className="quick-action-icon"><Tag size={20} /></div>
              <div>
                <h4>Create Offer</h4>
                <p>Add a new promotional discount</p>
              </div>
              <ChevronRight size={18} />
            </a>
          </div>
        </div>

        <div className="card">
          <h3>Subscription Breakdown</h3>
          <div className="subscription-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Active</span>
              <span className="breakdown-value active">{stats.activeSubscriptions}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Trial</span>
              <span className="breakdown-value trial">{stats.trialUsers}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Past Due</span>
              <span className="breakdown-value past_due">{stats.pastDueUsers}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function UsersList() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [getToken]);

  const filteredUsers = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'active';
      case 'trial': return 'trial';
      case 'past_due': return 'past_due';
      default: return 'none';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="spin" size={40} />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p>{users.length} total registered users</p>
        </div>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <p>No users found</p>
          </div>
        ) : (
          <div className="user-grid">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="user-card"
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-card-header">
                  <div className="user-avatar">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="user-info">
                    <h4>{user.name || 'No name'}</h4>
                    <p>{user.email || 'No email'}</p>
                  </div>
                </div>
                <div className="user-card-meta">
                  <span className={`status-badge ${getStatusColor(user.subscription_status)}`}>
                    {user.subscription_status || 'none'}
                  </span>
                  <span className="meta-item">
                    <Calendar size={14} /> {formatDate(user.createdAt)}
                  </span>
                </div>
                <div className="user-card-footer">
                  <span>{user.days_left || 0} days left</span>
                  <button className="btn-view">
                    <Eye size={16} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          getToken={getToken}
        />
      )}
    </main>
  );
}

function UserDetailModal({ user, onClose, getToken }: { user: User; onClose: () => void; getToken: () => Promise<string> }) {
  const [userClerkData, setUserClerkData] = useState<any>(null);

  useEffect(() => {
    async function fetchClerkData() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/user/${user.clerkId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserClerkData(data);
        }
      } catch (err) {
        console.error('Error fetching Clerk data:', err);
      }
    }
    fetchClerkData();
  }, [user.clerkId, getToken]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>User Details</h3>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2>{user.name || 'No name'}</h2>
              <p>{user.email || 'No email'}</p>
              <span className={`status-badge ${user.subscription_status}`}>
                {user.subscription_status || 'none'}
              </span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Clerk ID</label>
              <p className="code">{user.clerkId}</p>
            </div>
            <div className="detail-item">
              <label>Role</label>
              <p>{user.role || 'user'}</p>
            </div>
            <div className="detail-item">
              <label>Joined</label>
              <p>{formatDate(user.createdAt)}</p>
            </div>
            <div className="detail-item">
              <label>Subscription End</label>
              <p>{formatDate(user.subscription_end)}</p>
            </div>
            <div className="detail-item">
              <label>Days Left</label>
              <p>{user.days_left || 0} days</p>
            </div>
            <div className="detail-item">
              <label>Stripe Customer ID</label>
              <p className="code">{user.stripe_customer_id || 'N/A'}</p>
            </div>
          </div>

          {userClerkData && (
            <div className="clerk-data-section">
              <h4><Shield size={16} /> Clerk Data</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Public Metadata</label>
                  <p className="code-small">{JSON.stringify(userClerkData.publicMetadata || {}, null, 2)}</p>
                </div>
                <div className="detail-item">
                  <label>Last Sign In</label>
                  <p>{userClerkData.lastSignInAt ? formatDate(userClerkData.lastSignInAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OffersList() {
  const { getToken } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/admin/offers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOffers(data);
        }
      } catch (err) {
        console.error('Error fetching offers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, [getToken]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/admin/offers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(offers.filter(o => o.id !== id));
    } catch (err) {
      console.error('Error deleting offer:', err);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Code copied!');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 className="spin" size={40} />
        <p>Loading offers...</p>
      </div>
    );
  }

  return (
    <main className="main-content">
      <div className="page-header">
        <div>
          <h2>Offers</h2>
          <p>Manage promotional discount codes</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Create Offer
        </button>
      </div>

      <div className="card">
        {offers.length === 0 ? (
          <div className="empty-state">
            <Gift size={48} />
            <p>No offers yet. Create your first promotional code!</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Create Offer
            </button>
          </div>
        ) : (
          <div className="offers-grid">
            {offers.map((offer) => (
              <div key={offer.id} className="offer-card">
                <div className="offer-header">
                  <div className="offer-code">
                    <Tag size={16} />
                    <span>{offer.code}</span>
                    <button className="btn-copy" onClick={() => handleCopy(offer.code)}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <span className={`status-badge ${offer.active ? 'active' : 'none'}`}>
                    {offer.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="offer-body">
                  <p className="offer-description">{offer.description || 'No description'}</p>
                  <div className="offer-discount">
                    {offer.type === 'percentage' ? `${offer.discount}% OFF` : formatCurrency(offer.discount) + ' OFF'}
                  </div>
                </div>
                <div className="offer-footer">
                  <span className="offer-date">
                    <Calendar size={14} /> Created {formatDate(offer.createdAt)}
                  </span>
                  <div className="offer-actions">
                    <button className="btn-icon" onClick={() => handleDelete(offer.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateOfferModal
          onClose={() => setShowCreate(false)}
          getToken={getToken}
          onCreated={(newOffer) => setOffers([newOffer, ...offers])}
        />
      )}
    </main>
  );
}

function CreateOfferModal({ onClose, getToken, onCreated }: {
  onClose: () => void;
  getToken: () => Promise<string>;
  onCreated: (offer: Offer) => void;
}) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discount) return;

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          discount: type === 'percentage' ? parseInt(discount) : parseInt(discount) * 100,
          type,
          description
        })
      });
      if (res.ok) {
        const newOffer = await res.json();
        onCreated(newOffer);
        onClose();
      }
    } catch (err) {
      console.error('Error creating offer:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Offer</h3>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Discount Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER2024"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Discount Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Discount Value</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={type === 'percentage' ? '20' : '20'}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summer special discount"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Sidebar() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Shakespeare</h1>
        <span className="admin-badge">Admin</span>
      </div>
      <nav>
        <a href="/" className={isActive('/') ? 'active' : ''}>
          <BarChart3 size={18} /> Dashboard
        </a>
        <a href="/users" className={isActive('/users') ? 'active' : ''}>
          <Users size={18} /> Users
        </a>
        <a href="/offers" className={isActive('/offers') ? 'active' : ''}>
          <Tag size={18} /> Offers
        </a>
      </nav>
      <div className="sidebar-footer">
        <button onClick={() => signOut()} className="btn-signout">
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function App() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/users" element={<UsersList />} />
        <Route path="/offers" element={<OffersList />} />
      </Routes>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="signin-container">
      <div className="signin-card">
        <h1>Shakespeare Admin</h1>
        <p>Sign in to access the admin panel</p>
        <a href="http://localhost:5173" className="btn btn-primary">
          Go to App
        </a>
      </div>
    </div>
  );
}

function Root() {
  const { isSignedIn } = useAuth();
  return (
    <BrowserRouter>
      {isSignedIn ? <App /> : <SignInPage />}
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <Root />
    </ClerkProvider>
  </React.StrictMode>
);
