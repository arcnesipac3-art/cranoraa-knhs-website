import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { hasToken, getStoredUser, logoutRequest, tryRefreshToken } from '../utils/auth';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!hasToken()) return;
    try {
      // Use the generic profile endpoint that works for all roles
      const response = await api.get('/profile/');
      // Only fetch student-specific profile for student users (avoids 404 for staff/admin)
      const storedUser = getStoredUser();
      const profileResponse = (storedUser?.role === 'student')
        ? await api.get('/student/profile/').catch(() => null)
        : null;
      const updatedUser = {
        ...getStoredUser(),
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        profile_picture: profileResponse?.data?.profile?.profile_picture ?? response.data.profile?.profile_picture,
        mute_until: profileResponse?.data?.profile?.mute_until ?? null,
        is_muted: !!(profileResponse?.data?.profile?.is_muted),
        is_suspended: !!(profileResponse?.data?.profile?.is_suspended),
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  // Sync state from localStorage on mount; attempt token refresh if needed
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = getStoredUser();
      
      if (hasToken()) {
        // Already have access token in memory
        setUser(storedUser);
        refreshUser();
      } else if (storedUser) {
        // Has stored user but no access token (page refresh) - try to refresh
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          setUser(storedUser);
          refreshUser();
        } else {
          // Refresh failed - cookie expired or invalid
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
      }
      setReady(true);
    };
    
    initAuth();
  }, [refreshUser]);

  // Listen for the custom logout event fired by api.js interceptor (e.g. 401 on refresh)
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const signIn = useCallback((userData) => {
    setUser(userData);
  }, []);

  // Calls the backend to blacklist the refresh token + clear the httpOnly cookie,
  // then clears local state. Always awaited so the cookie is gone before navigation.
  const signOut = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
