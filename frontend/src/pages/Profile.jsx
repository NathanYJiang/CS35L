import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

const Profile = () => {
  const { user, token } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (user && token) {
      // In a real app we might fetch extra user data from our Firestore backend
      // Right now we can just show what Firebase Auth gives us
      setProfileData({
        email: user.email,
        phone: user.phoneNumber || 'Not provided',
        uid: user.uid
      });
    }
  }, [user, token]);

  if (!profileData) return <div className="page-container">Loading...</div>;

  return (
    <div className="page-container">
      <h2>My Profile</h2>
      <div className="profile-info">
        <div className="info-group">
          <label>Email</label>
          <p>{profileData.email}</p>
        </div>
        <div className="info-group">
          <label>User ID</label>
          <p style={{fontSize: '12px', color: '#666'}}>{profileData.uid}</p>
        </div>
      </div>
      
      <div className="profile-actions">
        <h3>Security</h3>
        <div className="action-item">
          <span>Two-Factor Authentication</span>
          <button className="secondary-btn">Enable 2FA (Firebase Auth)</button>
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
