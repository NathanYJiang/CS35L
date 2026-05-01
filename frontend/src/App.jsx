import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import GroupDetails from './pages/GroupDetails';
import { AuthContext } from './context/AuthContext';
import './index.css';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="page-container">Loading...</div>;
  }

  const isAuthenticated = !!user;

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} />
            
            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? <Home /> : <Navigate to="/login" />} />
            <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/groups/:id" element={isAuthenticated ? <GroupDetails /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
