import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { parseLocalDate, formatDateForInput } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiFilter, 
  FiSearch,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiX,
  FiMessageSquare,
  FiCalendar,
  FiTrash2
} from 'react-icons/fi';
import './Tareas.css';

const Tareas = () => {
  const { userData, isAdmin, isCoordinator } = useAuth();
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgencia, setFilterUrgencia] = useState('all');
  const [filterUsuario, setFilterUsuario] = useState('all');
  const [filterVencidas, setFilterVencidas] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const estados = [
    { value: 'pedido', label: 'Pedido', color: '#f59e0b' },
    { value: 'proceso', label: 'En proceso', color: '#3b82f6' },
    { value: 'bloqueo', label: 'Bloqueo', color: '#ef4444' },
    { value: 'falta_info', label: 'Falta de info', color: '#dc2626' },
    { value: 'espera', label: 'En espera de respuesta', color: '#8b5cf6' },
    { value: 'finalizado', label: 'Finalizado', color: '#10b981' }
  ];

  const urgencias = [
    { value: 'baja', label: 'Baja', color: '#6b7280' },
    { value: 'media', label: 'Media', color: '#f59e0b' },
    { value: 'alta', label: 'Alta', color: '#ef4444' },
    { value: 'urgente', label: 'Urgente', color: '#dc2626' }
  ];

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'marketingar_tareas'),
        orderBy('fechaCarga', 'desc')
      );
    } else {
      q = query(
        collection(db, 'marketingar_tareas'),
        where('asignadoId', '==', userData.id),
        orderBy('fechaCarga', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tareasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTareas(tareasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, userData]);

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'marketingar_users'), where('active', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsuarios(usersData);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const filteredTareas = tareas.filter(tarea => {
    const matchStatus = filterStatus === 'all' || tarea.estado === filterStatus;
    const matchUrgencia = filterUrgencia === 'all' || tarea.urgencia === filterUrgencia;
    const matchUsuario = filterUsuario === 'all' || tarea.asignadoId === filterUsuario;
    const matchSearch = tarea.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tarea.asignadoNombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de tareas vencidas
    let matchVencida = true;
    if (filterVencidas && tarea.fechaEntrega) {
      const entrega = tarea.fechaEntrega.toDate ? tarea.fechaEntrega.toDate() : new Date(tarea.fechaEntrega);
      matchVencida = entrega < new Date() && tarea.estado !== 'finalizado';
    }
    
    return matchStatus && matchUrgencia && matchUsuario && matchSearch && matchVencida;
  }).sort((a, b) => {
    // Ordenar: tareas finalizadas al final
    if (a.estado === 'finalizado' && b.estado !== 'finalizado') return 1;
    if (a.estado !== 'finalizado' && b.estado === 'finalizado') return -1;
    // Si ambas tienen el mismo estado, mantener orden por fecha de carga
    return b.fechaCarga?.toMillis?.() - a.fechaCarga?.toMillis?.() || 0;
  });

  const getEstadoColor = (estado) => {
    return estados.find(e => e.value === estado)?.color || '#6b7280';
  };

  const getUrgenciaColor = (urgencia) => {
    return urgencias.find(u => u.value === urgencia)?.color || '#6b7280';
  };

  const handleDeleteTarea = async (tareaId, tareaTitulo) => {
    if (!confirm(`¿Estás segura de que deseas eliminar la tarea "${tareaTitulo}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'marketingar_tareas', tareaId));
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      alert('Error al eliminar la tarea');
    }
  };

  if (loading) {
    return <div className="loading">Cargando tareas...</div>;
  }

  return (
    <div className="tareas-container">
      <div className="tareas-header">
        <div>
          <h1>Gestión de Tareas</h1>
          <p className="subtitle">
            {isAdmin ? 'Todas las tareas del equipo' : 'Mis tareas asignadas'}
          </p>
        </div>
        <motion.button
          className="btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
        >
          <FiPlus /> {isAdmin ? 'Nueva Tarea' : 'Nueva Tarea Personal'}
        </motion.button>
      </div>

      <div className="tareas-filters">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtros adicionales */}
        <div className="filtros-extra">
          {isAdmin && (
            <select 
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="filtro-select"
            >
              <option value="all">Todos los usuarios</option>
              {usuarios.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.areas?.[0]}
                </option>
              ))}
            </select>
          )}
          
          {!isAdmin && (
            <>
              <select 
                value={filterUrgencia}
                onChange={(e) => setFilterUrgencia(e.target.value)}
                className="filtro-select"
              >
                <option value="all">Todas las urgencias</option>
                {urgencias.map(urg => (
                  <option key={urg.value} value={urg.value}>{urg.label}</option>
                ))}
              </select>

              <label className="filtro-checkbox">
                <input
                  type="checkbox"
                  checked={filterVencidas}
                  onChange={(e) => setFilterVencidas(e.target.checked)}
                />
                Solo vencidas
              </label>
            </>
          )}
        </div>

        <div className="filter-buttons">
          <button
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            Todas ({tareas.length})
          </button>
          {estados.map(estado => (
            <button
              key={estado.value}
              className={filterStatus === estado.value ? 'active' : ''}
              onClick={() => setFilterStatus(estado.value)}
              style={{ 
                borderColor: estado.color,
                color: filterStatus === estado.value ? 'white' : estado.color,
                background: filterStatus === estado.value ? estado.color : 'transparent'
              }}
            >
              {estado.label} ({tareas.filter(t => t.estado === estado.value).length})
            </button>
          ))}
        </div>
      </div>

      <div className="tareas-grid">
        <AnimatePresence>
          {filteredTareas.map((tarea) => (
            <TareaCard
              key={tarea.id}
              tarea={tarea}
              getEstadoColor={getEstadoColor}
              getUrgenciaColor={getUrgenciaColor}
              isAdmin={isAdmin}
              isCoordinator={isCoordinator}
              onEdit={(tarea) => {
                setEditingTarea(tarea);
                setShowModal(true);
              }}
              onDelete={handleDeleteTarea}
            />
          ))}
        </AnimatePresence>

        {filteredTareas.length === 0 && (
          <div className="empty-state">
            <FiCheckCircle />
            <p>No hay tareas {filterStatus !== 'all' ? 'con este estado' : ''}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <NuevaTareaModal
            onClose={() => {
              setShowModal(false);
              setEditingTarea(null);
            }}
            estados={estados}
            urgencias={urgencias}
            tarea={editingTarea}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TareaCard = ({ tarea, getEstadoColor, getUrgenciaColor, isAdmin, isCoordinator, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isVencida = () => {
    if (!tarea.fechaEntrega) return false;
    const entrega = tarea.fechaEntrega.toDate ? tarea.fechaEntrega.toDate() : new Date(tarea.fechaEntrega);
    return entrega < new Date() && tarea.estado !== 'finalizado';
  };

  const tieneNotas = tarea.historial?.some(h => h.nota);

  return (
    <motion.div
      className={`tarea-card ${isVencida() ? 'vencida' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <div className="tarea-header">
        <div className="tarea-badges">
          <span 
            className="badge estado"
            style={{ background: getEstadoColor(tarea.estado) }}
          >
            {tarea.estado?.replace('_', ' ')}
          </span>
          <span 
            className="badge urgencia"
            style={{ background: getUrgenciaColor(tarea.urgencia) }}
          >
            {tarea.urgencia}
          </span>
        </div>
        <div className="tarea-actions">
          <button className="btn-icon" onClick={() => onEdit(tarea)}>
            <FiEdit2 />
          </button>
          {(isAdmin || isCoordinator) && (
            <button 
              className="btn-icon btn-delete" 
              onClick={() => onDelete(tarea.id, tarea.titulo)}
              title="Eliminar tarea"
            >
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>

      <h3 className="tarea-titulo">{tarea.titulo}</h3>
      
      {isAdmin && (
        <p className="tarea-asignado">
          Asignado a: <strong>{tarea.asignadoNombre}</strong>
        </p>
      )}

      <div className="tarea-dates">
        <div className="date-item">
          <FiClock />
          <span>Creada: {formatDate(tarea.fechaCarga)}</span>
        </div>
        {tarea.fechaEntrega && (
          <div className="date-item">
            <FiAlertCircle />
            <span>Entrega: {formatDate(tarea.fechaEntrega)}</span>
          </div>
        )}
      </div>

      {tarea.aclaraciones && (
        <p className="tarea-descripcion">{tarea.aclaraciones}</p>
      )}

      {tarea.comentarios && (
        <div className="tarea-comentarios">
          <strong>Comentarios:</strong>
          <p>{tarea.comentarios}</p>
        </div>
      )}

      {isAdmin && tarea.notasInternas && (
        <div className="tarea-notas">
          <strong>Notas internas:</strong>
          <p>{tarea.notasInternas}</p>
        </div>
      )}

      {tarea.historial && tarea.historial.length > 0 && (
        <div className="tarea-historial-section">
          <button 
            className="btn-historial"
            onClick={() => setShowHistorial(true)}
          >
            <FiMessageSquare />
            Ver historial de cambios
            {tieneNotas && <span className="historial-badge">Con notas</span>}
          </button>
        </div>
      )}

      <AnimatePresence>
        {showHistorial && (
          <HistorialModal
            historial={tarea.historial}
            titulo={tarea.titulo}
            onClose={() => setShowHistorial(false)}
            formatDateTime={formatDateTime}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const HistorialModal = ({ historial, titulo, onClose, formatDateTime }) => {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content historial-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>📋 Historial de cambios</h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="historial-content">
          <h3 className="tarea-titulo-modal">{titulo}</h3>
          
          <div className="historial-timeline">
            {historial.map((item, index) => (
              <div key={index} className="historial-item">
                <div className="historial-dot"></div>
                <div className="historial-card">
                  <div className="historial-header">
                    <div className="historial-accion">{item.accion}</div>
                    <div className="historial-fecha">
                      <FiCalendar />
                      {formatDateTime(item.fecha)}
                    </div>
                  </div>
                  <div className="historial-usuario">
                    Por: <strong>{item.usuario}</strong>
                  </div>
                  {item.nota && (
                    <div className="historial-nota">
                      <FiMessageSquare />
                      <div className="nota-content">
                        <strong>Nota:</strong>
                        <p>{item.nota}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const NuevaTareaModal = ({ onClose, estados, urgencias, tarea }) => {
  const { isAdmin, userData } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState(tarea ? {
    ...tarea,
    fechaEntrega: tarea.fechaEntrega ? formatDateForInput(tarea.fechaEntrega) : ''
  } : {
    titulo: '',
    asignadoId: isAdmin ? '' : userData.id,
    asignadoNombre: isAdmin ? '' : userData.name,
    fechaEntrega: '',
    urgencia: 'media',
    estado: 'pedido',
    aclaraciones: '',
    notasInternas: ''
  });
  const [notaCambio, setNotaCambio] = useState('');
  const [loading, setLoading] = useState(false);

  // Si no es admin y está editando, solo mostrar modal simple de cambio de estado
  const modoSimple = !isAdmin && tarea;

  useEffect(() => {
    if (isAdmin) {
      const unsubscribe = onSnapshot(
        query(collection(db, 'marketingar_users'), where('active', '==', true)),
        (snapshot) => {
          const users = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.role !== 'admin');
          setUsuarios(users);
        }
      );
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tareaData = {
        ...formData,
        fechaEntrega: formData.fechaEntrega ? parseLocalDate(formData.fechaEntrega) : null
      };

      if (tarea) {
        // Editar tarea existente
        const { id, ...updateData } = tareaData;
        
        const cambioEstado = tarea.estado !== formData.estado;
        const historialEntry = {
          fecha: new Date(),
          usuario: userData.name,
          accion: cambioEstado ? `Cambio de estado: ${tarea.estado} → ${formData.estado}` : 'Tarea actualizada',
          estado: formData.estado,
          nota: notaCambio || null
        };
        
        await updateDoc(doc(db, 'marketingar_tareas', tarea.id), {
          ...updateData,
          historial: [
            ...(tarea.historial || []),
            historialEntry
          ]
        });
      } else {
        // Crear nueva tarea
        await addDoc(collection(db, 'marketingar_tareas'), {
          ...tareaData,
          fechaCarga: new Date(),
          creadoPor: userData.name,
          historial: [{
            fecha: new Date(),
            usuario: userData.name,
            accion: 'Tarea creada',
            estado: formData.estado,
            nota: null
          }]
        });
      }
      
      // Cerrar modal y resetear estados
      setNotaCambio('');
      onClose();
    } catch (error) {
      console.error('Error guardando tarea:', error);
      alert('Error al guardar la tarea');
    }
    setLoading(false);
  };

  const handleUsuarioChange = (e) => {
    const userId = e.target.value;
    const usuario = usuarios.find(u => u.id === userId);
    setFormData({
      ...formData,
      asignadoId: userId,
      asignadoNombre: usuario?.name || ''
    });
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
        className={`modal-content ${modoSimple ? 'modal-simple' : ''}`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{modoSimple ? 'Actualizar Estado' : (tarea ? 'Editar Tarea' : 'Nueva Tarea')}</h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        {modoSimple ? (
          // MODAL SIMPLE PARA USUARIOS - Solo cambiar estado
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="tarea-info-simple">
              <h3>{tarea.titulo}</h3>
              <div className="tarea-meta">
                <span className="badge urgencia" style={{ background: urgencias.find(u => u.value === tarea.urgencia)?.color }}>
                  {tarea.urgencia}
                </span>
                {tarea.fechaEntrega && (
                  <span className="tarea-fecha-entrega">
                    <FiAlertCircle /> Entrega: {formatDateForInput(tarea.fechaEntrega)}
                  </span>
                )}
              </div>
              {tarea.aclaraciones && (
                <div className="tarea-aclaraciones-box">
                  <strong>Aclaraciones:</strong>
                  <p>{tarea.aclaraciones}</p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Estado de la tarea *</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                required
                className="estado-select-grande"
              >
                {estados.map(est => (
                  <option key={est.value} value={est.value}>{est.label}</option>
                ))}
              </select>
            </div>

            {tarea && (
              <div className="form-group">
                <label>Nota sobre el cambio (opcional)</label>
                <textarea
                  value={notaCambio}
                  onChange={(e) => setNotaCambio(e.target.value)}
                  rows="3"
                  placeholder="Agrega una nota sobre este cambio de estado..."
                  className="nota-cambio-textarea"
                />
                <small className="hint">Esta nota quedará registrada en el historial de la tarea</small>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Estado'}
              </button>
            </div>
          </form>
        ) : (
          // MODAL COMPLETO PARA ADMIN
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Título / Pedido *</label>
              <input
                type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              placeholder="Ej: Diseñar banner para Instagram"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Asignar a *</label>
              {isAdmin ? (
                <select
                  value={formData.asignadoId}
                  onChange={handleUsuarioChange}
                  required
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.areas?.[0]}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={userData.name}
                  disabled
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Fecha de entrega</label>
              <input
                type="date"
                value={formData.fechaEntrega}
                onChange={(e) => setFormData({ ...formData, fechaEntrega: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Urgencia</label>
              <select
                value={formData.urgencia}
                onChange={(e) => setFormData({ ...formData, urgencia: e.target.value })}
              >
                {urgencias.map(urg => (
                  <option key={urg.value} value={urg.value}>{urg.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                {estados.map(est => (
                  <option key={est.value} value={est.value}>{est.label}</option>
                ))}
              </select>
            </div>
          </div>

          {tarea && (
            <div className="form-group">
              <label>Nota sobre el cambio (opcional)</label>
              <textarea
                value={notaCambio}
                onChange={(e) => setNotaCambio(e.target.value)}
                placeholder="Explica por qué cambiaste el estado, urgencia, etc."
                rows="3"
              />
              <small style={{color: '#999', fontSize: '12px'}}>
                Esta nota se guardará en el historial de la tarea
              </small>
            </div>
          )}

          <div className="form-group">
            <label>Aclaraciones</label>
            <textarea
              value={formData.aclaraciones}
              onChange={(e) => setFormData({ ...formData, aclaraciones: e.target.value })}
              rows="3"
              placeholder="Detalles adicionales sobre la tarea..."
            />
          </div>

          <div className="form-group">
            <label>Notas Internas (solo admin)</label>
            <textarea
              value={formData.notasInternas}
              onChange={(e) => setFormData({ ...formData, notasInternas: e.target.value })}
              rows="2"
              placeholder="Notas privadas del coordinador..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <FiPlus /> {loading ? 'Guardando...' : (tarea ? 'Actualizar' : 'Crear Tarea')}
            </button>
          </div>
        </form>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Tareas;
