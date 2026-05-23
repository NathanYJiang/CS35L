import { useState } from 'react';
import { ms } from '../pages/GroupDetails.styles.js';

const AddMemberModal = ({ groupId, token, onClose, onAdded }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [notice, setNotice] = useState(null);

  const search = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    setNotice(null);
    try {
      const res = await fetch(`http://localhost:5001/api/users/search?query=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      if (!data?.length) throw new Error(`No user found with username "${q}".`);
      setResults(data);
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userId, username) => {
    setAdding(userId);
    try {
      const res = await fetch(`http://localhost:5001/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Could not add member.');
      setNotice({ type: 'success', message: `${username} added!` });
      setResults(r => r.filter(u => u.id !== userId));
      onAdded();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setAdding(null);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.sheet} onClick={e => e.stopPropagation()}>
        <div style={ms.sheetHandle} />
        <div style={ms.sheetHeader}>
          <h3 style={ms.sheetTitle}>Add Member</h3>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <p style={ms.sheetSub}>Search by username to invite someone to this group.</p>
        <form onSubmit={search} style={ms.searchRow}>
          <input style={ms.searchInput} placeholder="Username…" value={query} onChange={e => { setQuery(e.target.value); setNotice(null); }} autoFocus />
          <button type="submit" style={ms.searchBtn} disabled={loading}>{loading ? '…' : 'Search'}</button>
        </form>
        {notice && <p style={{ ...ms.feedback, color: notice.type === 'error' ? '#c62828' : 'var(--primary-color)' }}>{notice.message}</p>}
        <ul style={ms.resultList}>
          {results.map(u => (
            <li key={u.id} style={ms.resultItem}>
              <div style={ms.resultAvatar}>{(u.username || u.email || '?')[0].toUpperCase()}</div>
              <span style={ms.resultName}>{u.username || u.email}</span>
              <button style={ms.addBtn} onClick={() => addUser(u.id, u.username || u.email)} disabled={adding === u.id}>{adding === u.id ? '…' : 'Add'}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AddMemberModal;
