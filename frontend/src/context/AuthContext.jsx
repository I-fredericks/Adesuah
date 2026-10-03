import { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setSchool(res.data.user.school);
      })
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
    return res.data;
  };

  const registerSchool = async (payload) => {
    const res = await api.post('/auth/register-school', payload);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setSchool(res.data.school);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSchool(null);
  };

  const isPlatform = user?.role === 'SUPER_ADMIN';
  const isManagement = ['OWNER', 'ADMIN'].includes(user?.role);
  const canManageFees = ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role);
  const canTeach = ['OWNER', 'ADMIN', 'TEACHER'].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{ user, school, loading, login, registerSchool, logout, isPlatform, isManagement, canManageFees, canTeach }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
