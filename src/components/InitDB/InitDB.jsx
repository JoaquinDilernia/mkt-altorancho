import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const InitDB = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'marketingar_users'), {
        username: 'sofia',
        password: 'altolett123',
        name: 'Sofi',
        role: 'admin',
        areas: ['Coordinación Marketing'],
        partTime: false,
        active: true,
        createdAt: new Date()
      });
      setMessage(`✅ Usuario admin creado exitosamente! ID: ${docRef.id}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9999,
      minWidth: '300px'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#353434' }}>Inicializar Base de Datos</h3>
      <button
        onClick={createAdminUser}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: '#462829',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600'
        }}
      >
        {loading ? 'Creando...' : 'Crear Usuario Admin'}
      </button>
      {message && (
        <p style={{ 
          marginTop: '15px', 
          fontSize: '14px',
          padding: '10px',
          background: '#f5f5f5',
          borderRadius: '6px'
        }}>
          {message}
        </p>
      )}
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        Usuario: sofia<br/>
        Password: altolett123
      </p>
    </div>
  );
};

export default InitDB;
