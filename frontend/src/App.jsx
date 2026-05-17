import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import MyGroups from './pages/MyGroups';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GroupDetails from './pages/GroupDetails';
import GroupExpenses from './pages/GroupExpenses';
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
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" replace />} />
            
            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? <MyGroups /> : <Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
            <Route path="/groups/:id" element={isAuthenticated ? <GroupDetails /> : <Navigate to="/login" />} />
            <Route path="/groups/:id/expenses" element={isAuthenticated ? <GroupExpenses /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
