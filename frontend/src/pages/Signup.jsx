import React from 'react';

const Signup = () => {
  return (
    <div className="page-container">
      <h2>Sign Up</h2>
      <form className="auth-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input type="text" id="username" placeholder="Choose a username" />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email / Phone</label>
          <input type="text" id="email" placeholder="Enter email or phone number" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" placeholder="Create a password" />
        </div>
        <button type="submit" className="primary-btn">Sign Up</button>
      </form>
      <p>Already have an account? <a href="/login">Log in</a></p>
    </div>
  );
};

export default Signup;
