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
          <a href="/users">Users</a>
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
          <a href="/users" className="active">Users</a>
        </nav>
      </aside>
      <main className="main-content">
        <div className="page-header">
          <h2>Users</h2>
          <p>Manage registered users</p>
        </div>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sarah Mitchell</td>
                <td>sarah@shakespeare.com</td>
                <td>Jan 15, 2026</td>
                <td><button className="btn btn-secondary" style={{ padding: '8px 16px' }}>View</button></td>
              </tr>
              <tr>
                <td>James Cooper</td>
                <td>james@shakespeare.com</td>
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);