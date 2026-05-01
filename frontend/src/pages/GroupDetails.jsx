import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const GroupDetails = () => {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const fetchGroupData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [groupRes, membersRes] = await Promise.all([
        fetch(`http://localhost:5001/api/groups/${id}`, { headers }),
        fetch(`http://localhost:5001/api/groups/${id}/members`, { headers }),
      ]);

      if (groupRes.ok) setGroup(await groupRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err) {
      console.error('Failed to fetch group data', err);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id, token]);

  const searchUsers = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`http://localhost:5001/api/users/search?query=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSearchResults(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const inviteUser = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5001/api/groups/${id}/members`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setIsInviting(false);
        setSearchQuery('');
        setSearchResults([]);
        fetchGroupData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!group) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
      <h2>{group.name}</h2>
      
      <div className="dashboard-section">
        <h3>Members</h3>
        <ul className="member-list">
          {members.map(m => (
            <li key={m.id}>{m.id === user.uid ? 'You' : m.username || m.email}</li>
          ))}
        </ul>
        
        {isInviting ? (
          <div className="mt-10">
            <form onSubmit={searchUsers} className="flex gap-2 mb-10">
              <input 
                type="text" 
                placeholder="Search username" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{padding: '5px'}}
              />
              <button type="submit" className="primary-btn" style={{padding: '5px 10px'}}>Search</button>
              <button type="button" className="secondary-btn" style={{padding: '5px 10px'}} onClick={() => setIsInviting(false)}>Cancel</button>
            </form>
            <ul>
              {searchResults.map(u => (
                <li key={u.id} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                  {u.username}
                  <button onClick={() => inviteUser(u.id)} className="secondary-btn" style={{padding: '2px 8px'}}>Add</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <button className="secondary-btn mt-10" onClick={() => setIsInviting(true)}>Invite Friend</button>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
