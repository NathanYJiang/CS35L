import React from 'react';
import { useParams } from 'react-router-dom';

const GroupDetails = () => {
  const { id } = useParams();

  return (
    <div className="page-container">
      <h2>Group {id} Details</h2>
      
      <div className="dashboard-section">
        <h3>Members</h3>
        <ul className="member-list">
          <li>You (Owe $45.50)</li>
          <li>Alice (Owed $120.00)</li>
          <li>Bob (Owe $74.50)</li>
        </ul>
        <button className="secondary-btn mt-10">Invite Friend</button>
      </div>

      <div className="dashboard-section mt-20">
        <h3>Recent Payments</h3>
        <ul className="payment-list">
          <li><strong>Alice</strong> paid $240.00 for <em>Flight Tickets</em></li>
          <li><strong>You</strong> paid $85.00 for <em>Groceries</em></li>
        </ul>
        <button className="primary-btn mt-10">Add Payment</button>
      </div>
    </div>
  );
};

export default GroupDetails;
