import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        setUser({ loggedIn: true }); // We can store actual user data here if we fetch it
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    await authService.login(username, password);
    setUser({ loggedIn: true });
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
