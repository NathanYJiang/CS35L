import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { token } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [token]);

  const fetchGroups = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setGroups(data);
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      const res = await fetch('http://localhost:5001/api/groups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newGroupName })
      });
      if (res.ok) {
        setNewGroupName('');
        setIsCreating(false);
        fetchGroups();
      }
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  return (
    <div className="page-container">
      <h2>My Groups</h2>
      
      {isCreating ? (
        <form className="auth-form mb-20" onSubmit={handleCreateGroup}>
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Group Name" 
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="primary-btn">Create</button>
          <button type="button" className="secondary-btn mt-10" onClick={() => setIsCreating(false)}>Cancel</button>
        </form>
      ) : (
        <button className="primary-btn mb-20" onClick={() => setIsCreating(true)}>Create New Group</button>
      )}

      <div className="group-list">
        {groups.length === 0 ? (
          <p>You don't have any groups yet. Create one to get started!</p>
        ) : (
          groups.map(group => (
            <div key={group.id} className="group-card">
              <h3>{group.name}</h3>
              <Link to={`/groups/${group.id}`} className="secondary-btn mt-10">View Details</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
