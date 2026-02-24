import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay sesión guardada
    const savedUser = localStorage.getItem('marketingar_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Intentando login con:', username, password);
      
      const usersRef = collection(db, 'marketingar_users');
      const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
      
      console.log('Ejecutando query...');
      const querySnapshot = await getDocs(q);
      console.log('Resultados encontrados:', querySnapshot.size);
      
      if (querySnapshot.empty) {
        console.error('No se encontró el usuario');
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };
      console.log('Usuario encontrado:', userData);
      
      // Verificar password y que esté activo
      if (userData.password !== password.trim()) {
        console.error('Contraseña incorrecta');
        return { success: false, error: 'Contraseña incorrecta' };
      }
      
      if (!userData.active) {
        console.error('Usuario inactivo');
        return { success: false, error: 'Usuario inactivo' };
      }
      
      // Guardar en localStorage
      localStorage.setItem('marketingar_user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: `Error: ${error.message}` };
    }
  };

  const logout = () => {
    localStorage.removeItem('marketingar_user');
    setUser(null);
  };

  const value = {
    user,
    userData: user,
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isCoordinator: user?.role === 'manager',
    canEdit: user?.role === 'admin',
    isProducto: user?.role === 'producto',
    isVisual: user?.role === 'visual',
    isLocales: user?.role === 'locales',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
