import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API } from '../config/api';

const API_BASE_URL = API.groups;

const MyGroups = () => {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error('Network error while fetching groups:', error);
    }
  }, [token]);

  // Fetch-on-mount/token-change: an effect is the correct place to sync with
  // the server (an external system). The setState happens after the await, not
  // synchronously, so the cascading-render concern the rule guards against
  // doesn't apply here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="page-container my-groups-page">
      <header className="my-groups-header">
        <h1 className="my-groups-title">My groups</h1>
      </header>

      <section className="my-groups-scroll-region" aria-label="Available groups">
        <ul className="my-groups-blocks">
          <li>
            <button 
              className="my-groups-block my-groups-block--add" 
              onClick={() => setIsModalOpen(true)}
              aria-haspopup="dialog"
            >
              + add group
            </button>
          </li>

          {groups.map((group, index) => (
            <li key={group.id}>
              <Link 
                to={`/groups/${group.id}`} 
                className={`my-groups-block my-groups-block--group my-groups-block--tone-${index % 3}`}
              >
                {group.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="my-groups-footer">
        <nav aria-label="Footer navigation">
          <Link to="/profile">profile</Link> | 
          <button className="my-groups-footer-logout" onClick={handleLogout}>logout</button>
        </nav>
      </footer>

      <AddGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onGroupAdded={fetchGroups}
        token={token}
      />
    </main>
  );
};

const AddGroupModal = ({ isOpen, onClose, onGroupAdded, token }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsLoading(true);
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
        onClose();
        onGroupAdded(); 
      } else {
        console.error('Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="modal-title">Add group</h2>
        <form className="auth-form modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="groupNameInput">Group name</label>
            <input 
              id="groupNameInput"
              autoFocus
              required
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)} 
              placeholder="e.g. Hawaii 2026" 
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyGroups;
