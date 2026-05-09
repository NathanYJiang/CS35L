import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthContext } from './context/AuthContext';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <App />
      </AuthContext.Provider>
    );
    // Example: expect(screen.getByText(/login/i)).toBeInTheDocument();
  });
});
