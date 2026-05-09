import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// 1. Centralized API storage
const API_BASE_URL = 'http://localhost:5001/api/groups';

const MyGroups = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. Improved fetcher using useCallback and error handling
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        console.error('Failed to load groups:', res.statusText);
      }
    } catch (error) {
      console.error('Network error while fetching groups:', error);
    }
  }, [token]);

  useEffect(() => { 
    fetchGroups(); 
  }, [fetchGroups]);

  const handleAddGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      
      if (res.ok) {
        setNewGroupName('');
        setModalOpen(false);
        fetchGroups(); 
      } else {
        console.error('Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      // Ensures loading state is cleared even if the request fails
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container my-groups-page">
      <header className="my-groups-header">
        <h1 className="my-groups-title">My groups</h1>
      </header>

      <div className="my-groups-scroll-region">
        <ul className="my-groups-blocks">
          <li>
            <button className="my-groups-block my-groups-block--add" onClick={() => setModalOpen(true)}>
              + add group
            </button>
          </li>

          {groups.map((group, i) => (
            <li key={group.id}>
              <Link to={`/groups/${group.id}`} className={`my-groups-block my-groups-block--group my-groups-block--tone-${i % 3}`}>
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <footer className="my-groups-footer">
        <Link to="/profile">profile</Link> | <Link to="/settings">settings</Link> | 
        <button className="my-groups-footer-logout" onClick={handleLogout}>logout</button>
      </footer>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add group</h2>
            <form className="auth-form modal-form" onSubmit={handleAddGroup}>
              <div className="form-group">
                <label>Group name</label>
                <input 
                  autoFocus
                  required
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  placeholder="e.g. Hawaii 2026" 
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyGroups;
