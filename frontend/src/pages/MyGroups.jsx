import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const groupsCacheKey = (uid) => `endetted.groups.${uid || 'unknown'}`;

const safeParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const MyGroups = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState(() => {
    // Hydrate instantly so groups survive refresh/new tab.
    // We use a generic cache key first (user may not be available yet),
    // then we also persist to a user-specific key once uid is known.
    const raw = localStorage.getItem('endetted.groups.last');
    const cached = safeParseJson(raw);
    return Array.isArray(cached) ? cached : [];
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Persist groups whenever they change (for refresh/new tab).
  useEffect(() => {
    localStorage.setItem('endetted.groups.last', JSON.stringify(groups));
    const uid = user?.uid;
    if (uid) localStorage.setItem(groupsCacheKey(uid), JSON.stringify(groups));
  }, [groups, user?.uid]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('http://localhost:5001/api/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!ignore && res.ok && Array.isArray(data)) {
          // Merge server truth with any local pending groups.
          setGroups((prev) => {
            const serverIds = new Set(data.map((g) => g?.id).filter(Boolean));
            const pending = prev.filter((g) => g?.pending && !serverIds.has(g.id));
            return [...data, ...pending];
          });
        }
      } catch (err) {
        if (!ignore) console.error('Failed to fetch groups', err);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [token]);

  const refetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setGroups(data);
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddGroup = async (e) => {
    e.preventDefault();
    const groupName = newGroupName.trim();
    if (!groupName) return;
    setSubmitting(true);
    const tempId = `local-${Date.now()}`;
    const optimisticGroup = { id: tempId, name: groupName };
    setGroups((prev) => [...prev, optimisticGroup]);
    setNewGroupName('');
    setModalOpen(false);

    try {
      const res = await fetch('http://localhost:5001/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.id) {
        setGroups((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, ...data } : g))
        );
        await refetchGroups();
      } else {
        // Keep the local card visible even if backend creation fails.
        setGroups((prev) =>
          prev.map((g) =>
            g.id === tempId ? { ...g, id: `${tempId}-pending`, pending: true } : g
          )
        );
      }
    } catch (err) {
      console.error('Failed to create group', err);
      // Keep the local card visible when offline/backend is unavailable.
      setGroups((prev) =>
        prev.map((g) =>
          g.id === tempId ? { ...g, id: `${tempId}-pending`, pending: true } : g
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewGroupName('');
  };

  return (
    <div className="page-container my-groups-page">
      <header className="my-groups-header">
        <h1 className="my-groups-title">My groups</h1>
      </header>

      <div className="my-groups-scroll-region">
        <ul className="my-groups-blocks">
          <li>
            <button
              type="button"
              className="my-groups-block my-groups-block--add"
              onClick={() => setModalOpen(true)}
            >
              + add group
            </button>
          </li>
          {groups.map((group, index) => (
            <li key={group.id}>
              {(() => {
                const colorClass = `my-groups-block--tone-${index % 3}`;
                if (group.pending) {
                  return (
                    <div className={`my-groups-block my-groups-block--group ${colorClass} my-groups-block--pending`}>
                      {group.name}
                    </div>
                  );
                }
                return (
                  <Link to={`/groups/${group.id}`} className={`my-groups-block my-groups-block--group ${colorClass}`}>
                    {group.name}
                  </Link>
                );
              })()}
            </li>
          ))}
        </ul>
      </div>

      <footer className="my-groups-footer">
        <Link to="/profile">profile</Link>
        <span className="my-groups-footer-sep" aria-hidden="true">
          |
        </span>
        <Link to="/settings">settings</Link>
        <span className="my-groups-footer-sep" aria-hidden="true">
          |
        </span>
        <button type="button" className="my-groups-footer-logout" onClick={handleLogout}>
          logout
        </button>
      </footer>

      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-group-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-group-modal-title" className="modal-title">
              Add group
            </h2>
            <form className="auth-form modal-form" onSubmit={handleAddGroup}>
              <div className="form-group">
                <label htmlFor="modal-group-name">Group name</label>
                <input
                  id="modal-group-name"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Hawaii 2026"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn modal-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn modal-submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create'}
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
