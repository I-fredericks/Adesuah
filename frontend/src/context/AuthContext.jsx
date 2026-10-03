import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const applySession = (data) => {
    setUser(data.user);
    setSchool(data.user.school || data.school || null);
    setPermissions(data.permissions ?? []);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => applySession(res.data))
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setSchool(res.data.school);
    setPermissions(res.data.permissions ?? []);
    return res.data;
  };

  const registerSchool = async (payload) => {
    const res = await api.post('/auth/register-school', payload);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setSchool(res.data.school);
    setPermissions(res.data.permissions ?? []);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSchool(null);
    setPermissions([]);
  };

  // permissions === null means unrestricted (platform super admin)
  const can = (permission) => {
    if (permissions === null) return true;
    return permissions.includes(permission);
  };

  const isPlatform = user?.role === 'SUPER_ADMIN';
  const isManagement = ['OWNER', 'HEADTEACHER', 'DEPUTY_HEAD'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, school, loading, login, registerSchool, logout, can, isPlatform, isManagement }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
