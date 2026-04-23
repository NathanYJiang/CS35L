import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  // Mocking auth state for the skeleton
  const isLoggedIn = true; // Change this to false to see the logged-out state

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">endetted</Link>
      </div>
      <div className="navbar-links">
        {isLoggedIn ? (
          <>
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <button className="logout-btn">Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log In</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
