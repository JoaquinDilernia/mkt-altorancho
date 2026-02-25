// Script para ejecutar en la consola del navegador y actualizar roles de usuarios
// Ir a http://localhost:5173 > Abrir DevTools (F12) > Console > Pegar y ejecutar

import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const updateUserRole = async (username, newRole) => {
  try {
    const usersRef = collection(db, 'marketingar_users');
    const q = query(usersRef, where('username', '==', username.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`✗ Usuario '${username}' no encontrado`);
      return false;
    }
    
    const userDoc = querySnapshot.docs[0];
    await updateDoc(doc(db, 'marketingar_users', userDoc.id), {
      role: newRole
    });
    console.log(`✓ Usuario '${username}' actualizado a rol: ${newRole}`);
    return true;
  } catch (error) {
    console.error(`Error actualizando usuario '${username}':`, error);
    return false;
  }
};

const updateAllRoles = async () => {
  console.log('Iniciando actualización de roles de usuarios...\n');
  
  const updates = [
    { username: 'caro', role: 'visual' },
    { username: 'sofi', role: 'producto' },
    { username: 'marianne', role: 'producto' }
  ];
  
  for (const update of updates) {
    await updateUserRole(update.username, update.role);
  }
  
  console.log('\n✓ Actualización completada');
};

updateAllRoles();
