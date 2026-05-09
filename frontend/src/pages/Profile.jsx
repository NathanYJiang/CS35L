import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

const Profile = () => {
  const { user, token } = useContext(AuthContext);
  const profileData = useMemo(() => {
    if (!user || !token) return null;
    return {
      email: user.email,
      phone: user.phoneNumber || 'Not provided',
      uid: user.uid,
    };
  }, [user, token]);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [updatingUsername, setUpdatingUsername] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    let ignore = false;
    const fromAuth = user.displayName?.trim() || '';

    async function loadProfile() {
      try {
        const res = await fetch('http://localhost:5001/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (ignore) return;
        if (res.ok && data) {
          const fromDb = typeof data.username === 'string' ? data.username.trim() : '';
          setUsername(fromDb || fromAuth);
          setNewUsername(fromDb || fromAuth);
        } else {
          setUsername(fromAuth);
          setNewUsername(fromAuth);
        }
      } catch {
        if (!ignore) {
          setUsername(fromAuth);
          setNewUsername(fromAuth);
        }
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, [token, user]);

  const resetChangePasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setChangePasswordError('');
    setChangePasswordSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!auth.currentUser?.email) {
      setChangePasswordError('Missing user email. Please log out and log back in.');
      return;
    }
    if (!currentPassword) {
      setChangePasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setChangePasswordError('New password must be different from current password.');
      return;
    }

    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);

      setChangePasswordSuccess('Password updated.');
      setShowChangePassword(false);
      resetChangePasswordForm();
    } catch (err) {
      const msg = typeof err?.message === 'string' ? err.message : 'Failed to update password.';
      setChangePasswordError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    const clean = newUsername.trim();
    if (!clean) {
      setUsernameError('Username cannot be empty.');
      return;
    }
    if (clean === (resolvedUsername || '').trim()) {
      setEditingUsername(false);
      return;
    }

    setUpdatingUsername(true);
    try {
      const res = await fetch('http://localhost:5001/api/users/me/username', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data && typeof data.error === 'string' ? data.error : 'Failed to update username.';
        setUsernameError(msg);
        return;
      }
      const updatedName = (data?.displayName || data?.username || clean).trim();
      setUsername(updatedName);
      setNewUsername(updatedName);
      setEditingUsername(false);
      setUsernameSuccess('Username updated.');
    } catch {
      setUsernameError('Network error while updating username.');
    } finally {
      setUpdatingUsername(false);
    }
  };

  if (!profileData) return <div className="page-container">Loading...</div>;

  const resolvedUsername =
    username.trim() || user?.displayName?.trim() || '';

  return (
    <div className="page-container">
      <h2>My Profile</h2>
      <div className="profile-info">
        <div className="info-group">
          <label>Email</label>
          <p>{profileData.email}</p>
        </div>
        <div className="info-group">
          <label>Username</label>
          {!editingUsername ? (
            <p>{resolvedUsername || 'Not set'}</p>
          ) : (
            <form className="auth-form" onSubmit={handleUpdateUsername} style={{ marginBottom: 0 }}>
              <div className="form-group">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setUsernameError('');
                    setUsernameSuccess('');
                  }}
                  placeholder="Enter new username"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="secondary-btn" onClick={() => {
                  setEditingUsername(false);
                  setNewUsername(resolvedUsername || '');
                  setUsernameError('');
                }}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={updatingUsername}>
                  {updatingUsername ? 'Saving...' : 'Save username'}
                </button>
              </div>
            </form>
          )}
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
          <span>Username</span>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setEditingUsername((v) => !v);
              setUsernameError('');
              setUsernameSuccess('');
              setNewUsername(resolvedUsername || '');
            }}
          >
            {editingUsername ? 'Close' : 'Change Username'}
          </button>
        </div>
        {(usernameError || usernameSuccess) && (
          <p style={{ marginTop: '0.5rem', color: usernameError ? 'crimson' : 'green' }}>
            {usernameError || usernameSuccess}
          </p>
        )}
        <div className="action-item mt-10">
          <span>Password</span>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setShowChangePassword((v) => !v);
              resetChangePasswordForm();
            }}
          >
            Change Password
          </button>
        </div>

        {showChangePassword && (
          <form className="auth-form mt-20" onSubmit={handleChangePassword}>
            {changePasswordError && (
              <p className="error-message" style={{ color: 'crimson' }}>
                {changePasswordError}
              </p>
            )}
            {changePasswordSuccess && (
              <p className="success-message" style={{ color: 'green' }}>
                {changePasswordSuccess}
              </p>
            )}

            <div className="form-group">
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-new-password">Confirm new password</label>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowChangePassword(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={changingPassword}>
                {changingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
