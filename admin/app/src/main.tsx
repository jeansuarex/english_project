import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/globals.css';

function Dashboard() {
  return (
    <>
      <aside className="sidebar">
        <h1>Shakespeare</h1>
        <nav>
          <a href="/" className="active">Dashboard</a>
          <a href="/exams">Exams</a>
          <a href="/users">Users</a>
          <a href="/pricing">Pricing</a>
        </nav>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Overview of your Shakespeare platform</p>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Users</h4>
            <p>1,247</p>
          </div>
          <div className="stat-card">
            <h4>Active Exams</h4>
            <p>12</p>
          </div>
          <div className="stat-card">
            <h4>Exams Completed</h4>
            <p>3,891</p>
          </div>
          <div className="stat-card">
            <h4>Revenue</h4>
            <p>$24,580</p>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Recent Activity</h3>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Exam</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>sarah@shakespeare.com</td>
                <td>Completed</td>
                <td>Advanced Proficiency Exam</td>
                <td>May 2, 2026</td>
              </tr>
              <tr>
                <td>james@shakespeare.com</td>
                <td>Started</td>
                <td>Business English Assessment</td>
                <td>May 2, 2026</td>
              </tr>
              <tr>
                <td>maria@shakespeare.com</td>
                <td>Registered</td>
                <td>-</td>
                <td>May 1, 2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Exams() {
  return (
    <>
      <aside className="sidebar">
        <h1>Shakespeare</h1>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/exams" className="active">Exams</a>
          <a href="/users">Users</a>
          <a href="/pricing">Pricing</a>
        </nav>
      </aside>
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Exams</h2>
            <p>Manage your English proficiency exams</p>
          </div>
          <button className="btn btn-primary">+ Create Exam</button>
        </div>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Advanced Proficiency Exam</td>
                <td>50</td>
                <td>90 min</td>
                <td>$70</td>
                <td><span style={{ color: 'var(--sage)' }}>Active</span></td>
                <td><button className="btn btn-secondary" style={{ padding: '8px 16px' }}>Edit</button></td>
              </tr>
              <tr>
                <td>Business English Assessment</td>
                <td>40</td>
                <td>60 min</td>
                <td>$70</td>
                <td><span style={{ color: 'var(--sage)' }}>Active</span></td>
                <td><button className="btn btn-secondary" style={{ padding: '8px 16px' }}>Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Users() {
  return (
    <>
      <aside className="sidebar">
        <h1>Shakespeare</h1>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/exams">Exams</a>
          <a href="/users" className="active">Users</a>
          <a href="/pricing">Pricing</a>
        </nav>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h2>Users</h2>
          <p>Manage registered users and their plans</p>
        </div>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Exams</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sarah Mitchell</td>
                <td>sarah@shakespeare.com</td>
                <td>Individual Act</td>
                <td>3</td>
                <td>Jan 15, 2026</td>
                <td><button className="btn btn-secondary" style={{ padding: '8px 16px' }}>View</button></td>
              </tr>
              <tr>
                <td>James Cooper</td>
                <td>james@shakespeare.com</td>
                <td>The Anthology</td>
                <td>8</td>
                <td>Dec 3, 2025</td>
                <td><button className="btn btn-secondary" style={{ padding: '8px 16px' }}>View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function Pricing() {
  return (
    <>
      <aside className="sidebar">
        <h1>Shakespeare</h1>
        <nav>
          <a href="/">Dashboard</a>
          <a href="/exams">Exams</a>
          <a href="/users">Users</a>
          <a href="/pricing" className="active">Pricing</a>
        </nav>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h2>Pricing Plans</h2>
          <p>Manage subscription plans and pricing</p>
        </div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ padding: '24px', border: '2px solid var(--olive)', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Individual Act</h3>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '16px' }}>Single exam access</p>
              <p style={{ fontSize: '32px', fontWeight: 700 }}>$70</p>
              <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }}>Edit</button>
            </div>
            <div style={{ padding: '24px', border: '2px solid var(--sage)', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>The Anthology</h3>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '16px' }}>1 year full access</p>
              <p style={{ fontSize: '32px', fontWeight: 700 }}>$200</p>
              <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }}>Edit</button>
            </div>
            <div style={{ padding: '24px', border: '2px solid var(--olive)', borderRadius: 'var(--radius-sm)' }}>
              <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>The Globe</h3>
              <p style={{ color: 'var(--text-subtle)', marginBottom: '16px' }}>Business team access</p>
              <p style={{ fontSize: '32px', fontWeight: 700 }}>$20/user</p>
              <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }}>Edit</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/users" element={<Users />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);