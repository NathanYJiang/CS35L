import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  // Mock data for groups
  const groups = [
    { id: 1, name: "Japan Trip", balance: "+$120.00" },
    { id: 2, name: "Apartment Groceries", balance: "-$45.50" },
    { id: 3, name: "Weekend Skiing", balance: "$0.00" },
  ];

  return (
    <div className="page-container">
      <h2>My Groups</h2>
      <div className="group-list">
        {groups.map(group => (
          <div key={group.id} className="group-card">
            <h3>{group.name}</h3>
            <p className={group.balance.startsWith('+') ? 'positive-balance' : group.balance.startsWith('-') ? 'negative-balance' : ''}>
              Balance: {group.balance}
            </p>
            <Link to={`/groups/${group.id}`} className="secondary-btn">View Details</Link>
          </div>
        ))}
      </div>
      <button className="primary-btn mt-20">Create New Group</button>
    </div>
  );
};

export default Home;
