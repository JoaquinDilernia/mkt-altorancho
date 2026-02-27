import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiUsers, FiMapPin } from 'react-icons/fi';
import './Salas.css';

const COLORES_PRESET = [
  { label: 'Azul',     value: '#3b82f6' },
  { label: 'Verde',    value: '#10b981' },
  { label: 'Violeta',  value: '#8b5cf6' },
  { label: 'Naranja',  value: '#f59e0b' },
  { label: 'Rosa',     value: '#ec4899' },
  { label: 'Rojo',     value: '#ef4444' },
  { label: 'Marrón',   value: '#462829' },
  { label: 'Oscuro',   value: '#353434' },
];

const Salas = () => {
  const [salas, setSalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSala, setEditingSala] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'marketingar_salas'), orderBy('nombre')),
      (snapshot) => {
        setSalas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleDelete = async (sala) => {
    if (!confirm(`¿Eliminar la sala "${sala.nombre}"?\n\nNo podrás recuperarla, pero las reuniones ya creadas con esta sala no se verán afectadas.`)) return;
    try {
      await deleteDoc(doc(db, 'marketingar_salas', sala.id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la sala');
    }
  };

  if (loading) return <div className="loading">Cargando salas...</div>;

  const activas  = salas.filter(s => s.activa !== false).length;
  const inactivas = salas.length - activas;

  return (
    <div className="salas-container">
      <div className="salas-header">
        <div>
          <h1>Salas de reunión</h1>
          <p className="subtitle">
            {salas.length} sala{salas.length !== 1 ? 's' : ''} · {activas} activa{activas !== 1 ? 's' : ''}
            {inactivas > 0 && ` · ${inactivas} inactiva${inactivas !== 1 ? 's' : ''}`}
          </p>
        </div>
        <motion.button
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingSala(null); setShowModal(true); }}
        >
          <FiPlus /> Nueva Sala
        </motion.button>
      </div>

      {salas.length === 0 ? (
        <div className="salas-empty">
          <FiMapPin />
          <p>No hay salas configuradas todavía.</p>
          <p>Agregá al menos una sala presencial para poder reservarla en reuniones.</p>
        </div>
      ) : (
        <div className="salas-grid">
          {salas.map(sala => (
            <motion.div
              key={sala.id}
              className={`sala-card ${sala.activa === false ? 'inactiva' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <div
                className="sala-color-bar"
                style={{ background: sala.color || '#353434' }}
              />
              <div className="sala-card-body">
                <div className="sala-card-top">
                  <div className="sala-icon-wrap" style={{ background: (sala.color || '#353434') + '18' }}>
                    <FiMapPin style={{ color: sala.color || '#353434' }} />
                  </div>
                  <div className="sala-actions">
                    <button
                      className="btn-icon"
                      title="Editar"
                      onClick={() => { setEditingSala(sala); setShowModal(true); }}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="btn-icon danger"
                      title="Eliminar"
                      onClick={() => handleDelete(sala)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                <h3 className="sala-nombre">{sala.nombre}</h3>

                {sala.descripcion && (
                  <p className="sala-descripcion">{sala.descripcion}</p>
                )}

                <div className="sala-meta">
                  {sala.capacidad && (
                    <span className="sala-capacidad">
                      <FiUsers /> {sala.capacidad} persona{sala.capacidad !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className={`sala-estado ${sala.activa === false ? 'inactiva' : 'activa'}`}>
                    {sala.activa === false ? 'Inactiva' : 'Disponible'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <SalaModal
            sala={editingSala}
            onClose={() => { setShowModal(false); setEditingSala(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const SalaModal = ({ sala, onClose }) => {
  const [formData, setFormData] = useState(sala ? { ...sala } : {
    nombre:      '',
    capacidad:   '',
    descripcion: '',
    color:       '#3b82f6',
    activa:      true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const saveData = {
        nombre:      formData.nombre.trim(),
        capacidad:   formData.capacidad ? Number(formData.capacidad) : null,
        descripcion: formData.descripcion.trim() || null,
        color:       formData.color,
        activa:      formData.activa,
      };
      if (sala) {
        await updateDoc(doc(db, 'marketingar_salas', sala.id), saveData);
      } else {
        await addDoc(collection(db, 'marketingar_salas'), {
          ...saveData,
          createdAt: new Date()
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la sala');
    }
    setLoading(false);
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
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2><FiMapPin /> {sala ? 'Editar Sala' : 'Nueva Sala'}</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                required
                placeholder="Ej: Sala de Reuniones"
              />
            </div>
            <div className="form-group">
              <label>Capacidad (personas)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.capacidad}
                onChange={e => setFormData({ ...formData, capacidad: e.target.value })}
                placeholder="Ej: 8"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              rows="2"
              placeholder="Ej: Sala principal con TV y pizarrón..."
            />
          </div>

          <div className="form-group">
            <label>Color de identificación</label>
            <div className="color-picker">
              {COLORES_PRESET.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={`color-swatch ${formData.color === c.value ? 'selected' : ''}`}
                  style={{ background: c.value }}
                  title={c.label}
                  onClick={() => setFormData({ ...formData, color: c.value })}
                >
                  {formData.color === c.value && <span className="color-check">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activa}
                onChange={e => setFormData({ ...formData, activa: e.target.checked })}
              />
              Sala activa (disponible para reservas)
            </label>
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

export default Salas;
