import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTarget, FiCheckCircle, FiXCircle, FiDollarSign, FiCalendar, FiAlertCircle, FiPlus, FiX, FiUser } from 'react-icons/fi';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import './Objetivos.css';

const Objetivos = () => {
  const { userData, isAdmin, isCoordinator, area } = useAuth();
  const canManage = isAdmin || isCoordinator;
  const canEdit = canManage;
  const [objetivos, setObjetivos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [mesActual, setMesActual] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showNuevoObjetivo, setShowNuevoObjetivo] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  useEffect(() => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);

    let q;
    if (canManage) {
      q = query(
        collection(db, 'marketingar_objetivos'),
        where('mes', '>=', inicio),
        where('mes', '<=', fin),
        orderBy('mes', 'desc')
      );
    } else {
      // Usuario ve solo sus objetivos
      q = query(
        collection(db, 'marketingar_objetivos'),
        where('usuarioId', '==', userData.id),
        where('mes', '>=', inicio),
        where('mes', '<=', fin),
        orderBy('mes', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setObjetivos(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mesActual, canManage, userData]);

  useEffect(() => {
    if (canManage) {
      const q = query(collection(db, 'marketingar_users'), where('active', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Coordinador: solo ve usuarios de su área
        if (isCoordinator && area) {
          usersData = usersData.filter(u => u.area === area);
        }
        setUsuarios(usersData);
      });
      return () => unsubscribe();
    }
  }, [canManage, isCoordinator, area]);

  const objetivoMesActual = objetivos.find(obj => {
    const objMes = obj.mes.toDate ? obj.mes.toDate() : new Date(obj.mes);
    const mesCoincide = format(objMes, 'MM-yyyy') === format(mesActual, 'MM-yyyy');

    if (canManage && usuarioSeleccionado) {
      return mesCoincide && obj.usuarioId === usuarioSeleccionado;
    }
    return mesCoincide && obj.usuarioId === userData.id;
  });

  const condiciones = [
    {
      id: 'chatbot',
      label: 'Chatbot 100% respondido',
      icon: FiCheckCircle,
      key: 'chatbot100',
      descripcion: 'Todos los mensajes del chatbot deben estar respondidos'
    },
    {
      id: 'tiendanube',
      label: '0 mensajes Tienda Nube sin responder',
      icon: FiCheckCircle,
      key: 'tiendaNube0',
      descripcion: 'No puede quedar ningún mensaje sin respuesta en Tienda Nube'
    },
    {
      id: 'google',
      label: '0 opiniones negativas Google',
      icon: FiCheckCircle,
      key: 'googleReviews0',
      descripcion: 'No puede haber opiniones negativas nuevas en Google'
    }
  ];

  const handleCrearObjetivo = async (formData) => {
    const usuarioTarget = usuarios.find(u => u.id === formData.usuarioId);
    
    // Verificar si ya existe un objetivo para ese usuario y mes
    const existente = objetivos.find(obj => {
      const objMes = obj.mes.toDate ? obj.mes.toDate() : new Date(obj.mes);
      return format(objMes, 'MM-yyyy') === format(mesActual, 'MM-yyyy') && obj.usuarioId === formData.usuarioId;
    });
    
    if (existente) {
      alert('Ya existe un objetivo para este usuario en este mes');
      return;
    }

    try {
      await addDoc(collection(db, 'marketingar_objetivos'), {
        mes: mesActual,
        usuarioId: formData.usuarioId,
        usuarioNombre: usuarioTarget.name,
        titulo: formData.titulo,
        montoBono: parseFloat(formData.montoBono),
        condiciones: formData.condiciones,
        cumplido: false,
        bonoAprobado: false,
        observaciones: '',
        createdAt: new Date(),
        creadoPor: userData.name
      });
      setShowNuevoObjetivo(false);
    } catch (error) {
      console.error('Error creando objetivo:', error);
      alert('Error al crear el objetivo');
    }
  };

  const handleToggleCondicion = async (condicionIndex) => {
    if (!canEdit || !objetivoMesActual) return;

    const condicionesActualizadas = [...objetivoMesActual.condiciones];
    condicionesActualizadas[condicionIndex].cumplida = !condicionesActualizadas[condicionIndex].cumplida;
    
    const todasCumplidas = condicionesActualizadas.every(c => c.cumplida);

    try {
      await updateDoc(doc(db, 'marketingar_objetivos', objetivoMesActual.id), {
        condiciones: condicionesActualizadas,
        cumplido: todasCumplidas
      });
    } catch (error) {
      console.error('Error actualizando condición:', error);
    }
  };

  const handleAprobarBono = async () => {
    if (!canEdit || !objetivoMesActual) return;

    if (!objetivoMesActual.cumplido) {
      alert('No se puede aprobar el bono porque no se cumplieron todas las condiciones');
      return;
    }

    try {
      await updateDoc(doc(db, 'marketingar_objetivos', objetivoMesActual.id), {
        bonoAprobado: !objetivoMesActual.bonoAprobado,
        fechaAprobacion: new Date(),
        aprobadoPor: userData.name
      });
    } catch (error) {
      console.error('Error aprobando bono:', error);
    }
  };

  const handleUpdateObservaciones = async (texto) => {
    if (!canEdit || !objetivoMesActual) return;

    try {
      await updateDoc(doc(db, 'marketingar_objetivos', objetivoMesActual.id), {
        observaciones: texto
      });
    } catch (error) {
      console.error('Error actualizando observaciones:', error);
    }
  };

  if (loading) {
    return <div className="loading">Cargando objetivos...</div>;
  }

  const usuarioActual = canManage && usuarioSeleccionado
    ? usuarios.find(u => u.id === usuarioSeleccionado)
    : { name: userData.name };

  return (
    <div className="objetivos-container">
      <div className="objetivos-header">
        <div>
          <h1>Objetivos y Bonos</h1>
          <p className="subtitle">
            {canManage ? 'Gestión de objetivos del equipo' : 'Mis objetivos personales'}
          </p>
        </div>
        <div className="header-actions">
          {canManage && (
            <select
              className="usuario-selector"
              value={usuarioSeleccionado || ''}
              onChange={(e) => setUsuarioSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar usuario...</option>
              {usuarios.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}{user.especialidad ? ` (${user.especialidad})` : ''}
                </option>
              ))}
            </select>
          )}
          
          <div className="mes-selector">
            <button onClick={() => setMesActual(new Date(mesActual.setMonth(mesActual.getMonth() - 1)))}>
              ←
            </button>
            <span className="mes-actual">
              {format(mesActual, 'MMMM yyyy', { locale: es })}
            </span>
            <button onClick={() => setMesActual(new Date(mesActual.setMonth(mesActual.getMonth() + 1)))}>
              →
            </button>
          </div>
          
          {canEdit && usuarioSeleccionado && (
            <button className="btn-primary" onClick={() => setShowNuevoObjetivo(true)}>
              <FiPlus /> Nuevo Objetivo
            </button>
          )}
        </div>
      </div>

      {!objetivoMesActual ? (
        <motion.div
          className="no-objetivo-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FiAlertCircle />
          <h3>
            {canManage && !usuarioSeleccionado
              ? 'Selecciona un usuario para ver o crear objetivos'
              : `No hay objetivos para ${usuarioActual?.name} en este mes`}
          </h3>
          {canEdit && usuarioSeleccionado && (
            <button className="btn-primary" onClick={() => setShowNuevoObjetivo(true)}>
              <FiTarget /> Crear Objetivo del Mes
            </button>
          )}
        </motion.div>
      ) : (
        <div className="objetivo-principal">
          <motion.div
            className="bono-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="bono-icon">
              <FiDollarSign />
            </div>
            <div className="bono-info">
              <h2>{objetivoMesActual.titulo || 'Bono Mensual'}</h2>
              <div className="bono-usuario">
                <FiUser /> {objetivoMesActual.usuarioNombre}
              </div>
              <div className="bono-monto">${objetivoMesActual.montoBono?.toLocaleString('es-AR') || '0'}</div>
              <div className={`bono-estado ${objetivoMesActual.bonoAprobado ? 'aprobado' : objetivoMesActual.cumplido ? 'pendiente' : 'bloqueado'}`}>
                {objetivoMesActual.bonoAprobado 
                  ? '✓ Bono Aprobado' 
                  : objetivoMesActual.cumplido 
                  ? '⏳ Pendiente de aprobación'
                  : '🔒 Bloqueado - Condiciones incompletas'}
              </div>
            </div>
            {canEdit && objetivoMesActual.cumplido && (
              <button
                className={`btn-aprobar ${objetivoMesActual.bonoAprobado ? 'aprobado' : ''}`}
                onClick={handleAprobarBono}
              >
                {objetivoMesActual.bonoAprobado ? 'Revocar Aprobación' : 'Aprobar Bono'}
              </button>
            )}
          </motion.div>

          <div className="condiciones-grid">
            <h3>Condiciones para el bono (todas deben cumplirse)</h3>
            {(objetivoMesActual.condiciones || []).map((condicion, index) => {
              return (
                <motion.div
                  key={index}
                  className={`condicion-card ${condicion.cumplida ? 'cumplida' : 'pendiente'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => canEdit && handleToggleCondicion(index)}
                  style={{ cursor: canEdit ? 'pointer' : 'default' }}
                >
                  <div className="condicion-icon">
                    {condicion.cumplida ? <FiCheckCircle /> : <FiXCircle />}
                  </div>
                  <div className="condicion-info">
                    <h4>{condicion.texto}</h4>
                  </div>
                  <div className={`condicion-status ${condicion.cumplida ? 'ok' : 'no'}`}>
                    {condicion.cumplida ? 'CUMPLIDO' : 'PENDIENTE'}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="observaciones-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3>Observaciones del mes</h3>
            <textarea
              className="observaciones-textarea"
              value={objetivoMesActual.observaciones || ''}
              onChange={(e) => handleUpdateObservaciones(e.target.value)}
              placeholder="Registrar novedades, inconvenientes o logros destacados del mes..."
              disabled={!canEdit}
              rows="6"
            />
            <div className="observaciones-footer">
              <FiCalendar />
              <span>
                Creado: {format(objetivoMesActual.createdAt.toDate(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
              </span>
            </div>
          </motion.div>

          {objetivoMesActual.bonoAprobado && objetivoMesActual.fechaAprobacion && (
            <motion.div
              className="aprobacion-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <FiCheckCircle />
              Bono aprobado por {objetivoMesActual.aprobadoPor} el{' '}
              {format(objetivoMesActual.fechaAprobacion.toDate(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
            </motion.div>
          )}
        </div>
      )}

      <motion.div
        className="resumen-historico"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3>Historial de Objetivos</h3>
        <div className="historial-grid">
          {objetivos.filter(obj => !canManage || !usuarioSeleccionado || obj.usuarioId === usuarioSeleccionado).map(obj => {
            const mes = obj.mes.toDate ? obj.mes.toDate() : new Date(obj.mes);
            const condicionesCumplidas = (obj.condiciones || []).filter(c => c.cumplida).length;
            const totalCondiciones = (obj.condiciones || []).length;
            
            return (
              <div
                key={obj.id}
                className={`historial-card ${obj.bonoAprobado ? 'aprobado' : obj.cumplido ? 'cumplido' : 'pendiente'}`}
              >
                <div className="historial-mes">
                  {format(mes, 'MMMM yyyy', { locale: es })}
                </div>
                <div className="historial-usuario">
                  {obj.usuarioNombre}
                </div>
                <div className="historial-progreso">
                  {condicionesCumplidas} / {totalCondiciones} cumplidas
                </div>
                <div className="historial-estado">
                  {obj.bonoAprobado ? '✓ Bono pagado' : obj.cumplido ? '⏳ Pendiente' : '✗ No cumplido'}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {showNuevoObjetivo && (
          <NuevoObjetivoModal
            onClose={() => setShowNuevoObjetivo(false)}
            onCreate={handleCrearObjetivo}
            usuarios={usuarios}
            usuarioSeleccionado={usuarioSeleccionado}
            mes={mesActual}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NuevoObjetivoModal = ({ onClose, onCreate, usuarios, usuarioSeleccionado, mes }) => {
  const [formData, setFormData] = useState({
    usuarioId: usuarioSeleccionado || '',
    titulo: '',
    montoBono: '',
    condiciones: [{ texto: '', cumplida: false }]
  });

  const handleAddCondicion = () => {
    setFormData({
      ...formData,
      condiciones: [...formData.condiciones, { texto: '', cumplida: false }]
    });
  };

  const handleRemoveCondicion = (index) => {
    setFormData({
      ...formData,
      condiciones: formData.condiciones.filter((_, i) => i !== index)
    });
  };

  const handleCondicionChange = (index, texto) => {
    const nuevasCondiciones = [...formData.condiciones];
    nuevasCondiciones[index].texto = texto;
    setFormData({ ...formData, condiciones: nuevasCondiciones });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.usuarioId || !formData.titulo || !formData.montoBono) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    if (formData.condiciones.some(c => !c.texto.trim())) {
      alert('Todas las condiciones deben tener texto');
      return;
    }
    onCreate(formData);
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
          <h2>Nuevo Objetivo - {format(mes, 'MMMM yyyy', { locale: es })}</h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Usuario *</label>
            <select
              value={formData.usuarioId}
              onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {usuarios.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}{user.especialidad ? ` (${user.especialidad})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Título del objetivo *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Bono mensual por atención al cliente"
              required
            />
          </div>

          <div className="form-group">
            <label>Monto del bono ($) *</label>
            <input
              type="number"
              value={formData.montoBono}
              onChange={(e) => setFormData({ ...formData, montoBono: e.target.value })}
              placeholder="100000"
              required
              min="0"
              step="1000"
            />
          </div>

          <div className="form-group">
            <label>Condiciones a cumplir</label>
            {formData.condiciones.map((condicion, index) => (
              <div key={index} className="condicion-input-row">
                <input
                  type="text"
                  value={condicion.texto}
                  onChange={(e) => handleCondicionChange(index, e.target.value)}
                  placeholder={`Condición ${index + 1}`}
                  required
                />
                {formData.condiciones.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveCondicion(index)}
                  >
                    <FiX />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddCondicion}
            >
              <FiPlus /> Agregar condición
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Crear Objetivo
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Objetivos;
