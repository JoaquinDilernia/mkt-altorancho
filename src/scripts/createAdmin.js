// Script para ejecutar en la consola del navegador y crear el usuario admin
// Ir a http://localhost:5173 > Abrir DevTools (F12) > Console > Pegar y ejecutar

import { db } from './firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const createAdminUser = async () => {
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
    console.log('Usuario admin creado con ID:', docRef.id);
  } catch (error) {
    console.error('Error creando usuario:', error);
  }
};

createAdminUser();
