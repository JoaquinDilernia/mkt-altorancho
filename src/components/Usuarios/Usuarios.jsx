import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiX, FiSave, FiUserCheck, FiUserX } from 'react-icons/fi';
import './Usuarios.css';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'marketingar_users')),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsuarios(users);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setShowModal(true);
  };

  const handleDelete = async (usuarioId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'marketingar_users', usuarioId));
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const handleToggleActive = async (usuario) => {
    try {
      await updateDoc(doc(db, 'marketingar_users', usuario.id), {
        active: !usuario.active
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      alert('Error al actualizar usuario');
    }
  };

  const usuariosActivos = usuarios.filter(u => u.active).length;
  const admins = usuarios.filter(u => u.role === 'admin').length;

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>;
  }

  return (
    <div className="usuarios-container">
      <div className="usuarios-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitle">
            {usuarios.length} usuarios totales · {usuariosActivos} activos · {admins} administradores
          </p>
        </div>
        <motion.button
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
        >
          <FiPlus /> Nuevo Usuario
        </motion.button>
      </div>

      <div className="usuarios-grid">
        {usuarios.map((usuario) => (
          <motion.div
            key={usuario.id}
            className={`usuario-card ${!usuario.active ? 'inactive' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
          >
            <div className="usuario-card-header">
              <div className="usuario-avatar-large">
                {usuario.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="usuario-actions">
                <button 
                  className="btn-icon" 
                  onClick={() => handleEdit(usuario)}
                  title="Editar"
                >
                  <FiEdit2 />
                </button>
                <button 
                  className="btn-icon" 
                  onClick={() => handleToggleActive(usuario)}
                  title={usuario.active ? 'Desactivar' : 'Activar'}
                >
                  {usuario.active ? <FiUserCheck /> : <FiUserX />}
                </button>
                {usuario.role !== 'admin' && (
                  <button 
                    className="btn-icon danger" 
                    onClick={() => handleDelete(usuario.id)}
                    title="Eliminar"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>

            <div className="usuario-card-body">
              <h3>{usuario.name}</h3>
              <div className="usuario-username">@{usuario.username}</div>
              
              <div className="usuario-badges">
                <span className={`badge ${usuario.role === 'admin' ? 'admin' : 'user'}`}>
                  {usuario.role === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
                {usuario.partTime && (
                  <span className="badge parttime">Part Time</span>
                )}
                {!usuario.active && (
                  <span className="badge inactive-badge">Inactivo</span>
                )}
              </div>

              {usuario.areas && usuario.areas.length > 0 && (
                <div className="usuario-areas">
                  <strong>Áreas:</strong>
                  <ul>
                    {usuario.areas.map((area, index) => (
                      <li key={index}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {usuario.diasLaborales && (
                <div className="usuario-schedule">
                  <strong>Horario Semanal:</strong>
                  <div className="schedule-mini">
                    {Object.entries(usuario.diasLaborales).map(([dia, tipo]) => {
                      if (tipo === 'franco') return null;
                      return (
                        <span key={dia} className={`schedule-badge ${tipo}`}>
                          {dia.slice(0, 3).toUpperCase()}: {tipo === 'oficina' ? '🏢' : '🏠'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <UsuarioModal
            onClose={() => {
              setShowModal(false);
              setEditingUser(null);
            }}
            usuario={editingUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const UsuarioModal = ({ onClose, usuario }) => {
  const [formData, setFormData] = useState(
    usuario || {
      username: '',
      password: '',
      name: '',
      role: 'user',
      areas: [''],
      partTime: false,
      active: true,
      diasLaborales: {
        lunes: 'oficina',
        martes: 'oficina',
        miercoles: 'oficina',
        jueves: 'oficina',
        viernes: 'oficina',
        sabado: 'franco',
        domingo: 'franco'
      }
    }
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = {
        ...formData,
        areas: formData.areas.filter(a => a.trim() !== ''),
        username: formData.username.toLowerCase().trim()
      };

      if (usuario) {
        // Actualizar
        const { id, ...updateData } = userData;
        await updateDoc(doc(db, 'marketingar_users', usuario.id), updateData);
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'marketingar_users'), {
          ...userData,
          createdAt: new Date()
        });
      }
      onClose();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error al guardar usuario');
    }
    setLoading(false);
  };

  const addArea = () => {
    setFormData({ ...formData, areas: [...formData.areas, ''] });
  };

  const removeArea = (index) => {
    const newAreas = formData.areas.filter((_, i) => i !== index);
    setFormData({ ...formData, areas: newAreas });
  };

  const updateArea = (index, value) => {
    const newAreas = [...formData.areas];
    newAreas[index] = value;
    setFormData({ ...formData, areas: newAreas });
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <FiUsers /> {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre completo *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: María González"
              />
            </div>

            <div className="form-group">
              <label>Usuario *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                placeholder="Ej: maria"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Contraseña {!usuario && '*'}</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!usuario}
                placeholder={usuario ? 'Dejar vacío para mantener' : 'Contraseña'}
              />
            </div>

            <div className="form-group">
              <label>Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Áreas de responsabilidad</label>
            {formData.areas.map((area, index) => (
              <div key={index} className="area-input-group">
                <input
                  type="text"
                  value={area}
                  onChange={(e) => updateArea(index, e.target.value)}
                  placeholder="Ej: Marketing Digital"
                />
                {formData.areas.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove-area"
                    onClick={() => removeArea(index)}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-area" onClick={addArea}>
              <FiPlus /> Agregar área
            </button>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.partTime}
                onChange={(e) => setFormData({ ...formData, partTime: e.target.checked })}
              />
              Part Time
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Usuario activo
            </label>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>
              Configuración Semanal
            </label>
            <div className="dias-laborales-grid">
              {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                <div key={dia} className="dia-laboral-item">
                  <label className="dia-laboral-label">
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </label>
                  <select
                    value={formData.diasLaborales?.[dia] || 'franco'}
                    onChange={(e) => setFormData({
                      ...formData,
                      diasLaborales: {
                        ...formData.diasLaborales,
                        [dia]: e.target.value
                      }
                    })}
                    className="dia-laboral-select"
                  >
                    <option value="oficina">Oficina</option>
                    <option value="home">Home</option>
                    <option value="franco">Franco</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <FiSave /> {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Usuarios;
