import React from 'react';

const Profile = () => {
  return (
    <div className="page-container">
      <h2>My Profile</h2>
      <div className="profile-info">
        <div className="info-group">
          <label>Username</label>
          <p>john_doe_99</p>
        </div>
        <div className="info-group">
          <label>Email / Phone</label>
          <p>john@example.com</p>
        </div>
      </div>
      
      <div className="profile-actions">
        <h3>Security</h3>
        <div className="action-item">
          <span>Two-Factor Authentication</span>
          <button className="secondary-btn">Enable 2FA</button>
        </div>
        <div className="action-item mt-10">
          <span>Password</span>
          <button className="secondary-btn">Change Password</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
