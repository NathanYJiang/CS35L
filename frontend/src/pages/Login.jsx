import React from 'react';

const Login = () => {
  return (
    <div className="page-container">
      <h2>Log In</h2>
      <form className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email / Phone</label>
          <input type="text" id="email" placeholder="Enter email or phone number" />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" placeholder="Enter password" />
        </div>
        <button type="submit" className="primary-btn">Log In</button>
      </form>
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </div>
  );
};

export default Login;
