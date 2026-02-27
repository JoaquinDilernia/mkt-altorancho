import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
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
  const unsubscribeRef = useRef(null);

  const startListening = (userId, onFirstSnapshot) => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    let firstFired = false;
    unsubscribeRef.current = onSnapshot(doc(db, 'marketingar_users', userId), (snap) => {
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() };
        localStorage.setItem('marketingar_user', JSON.stringify(updated));
        setUser(updated);
      }
      if (!firstFired) {
        firstFired = true;
        onFirstSnapshot?.();
      }
    });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('marketingar_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // loading se apaga recién cuando llega el primer snapshot con datos frescos
      startListening(parsed.id, () => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);

  const login = async (username, password) => {
    try {
      const usersRef = collection(db, 'marketingar_users');
      const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };

      if (userData.password !== password.trim()) {
        return { success: false, error: 'Contraseña incorrecta' };
      }

      if (!userData.active) {
        return { success: false, error: 'Usuario inactivo' };
      }

      localStorage.setItem('marketingar_user', JSON.stringify(userData));
      setUser(userData);
      startListening(userData.id);

      return { success: true };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: `Error: ${error.message}` };
    }
  };

  const logout = () => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = null;
    localStorage.removeItem('marketingar_user');
    setUser(null);
  };

  const value = {
    user,
    userData: user,
    loading,
    login,
    logout,
    // ── Sistema de roles ───────────────────────────────────────────────────
    // roleType: 'superadmin' | 'coordinador' | 'directivo'
    //         | 'asistente' | 'community' | 'pauta' | 'atencion_cliente'
    //         | 'diseno' | 'visual' | 'producto' | 'local'
    // area:    'marketing' | 'producto' | 'locales'
    roleType: user?.roleType ?? null,
    area:     user?.area     ?? null,
    // ── Booleanos derivados ────────────────────────────────────────────────
    isAdmin:       user?.roleType === 'superadmin',
    isCoordinator: user?.roleType === 'coordinador',
    isManager:     user?.roleType === 'directivo',
    canEdit:       user?.roleType === 'superadmin' || user?.roleType === 'coordinador',
    isProducto:    user?.area === 'producto',
    isVisual:      user?.roleType === 'visual',
    isLocales:     user?.area === 'locales',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
