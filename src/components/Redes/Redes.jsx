import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { parseLocalDate, formatDateForInput } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiInstagram,
  FiMail,
  FiImage,
  FiCheck,
  FiX,
  FiTrash2,
  FiAlertTriangle
} from 'react-icons/fi';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import './Redes.css';

const Redes = () => {
  const { userData, isAdmin, isManager, isCoordinator } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contenidos, setContenidos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingContenido, setEditingContenido] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = (isAdmin || isCoordinator) && !isManager;

  const focos = [
    'producto', 'comercial', 'info', 'campaña',
    'lanzamiento', 'venta', 'novedad', 'mayorista', 'apertura'
  ];

  const canales = [
    { value: 'ig_historias', label: 'Historias IG', icon: FiInstagram, requiresLink: false },
    { value: 'ig_post', label: 'Post IG', icon: FiInstagram, requiresLink: true },
    { value: 'ig_reel', label: 'Reel IG', icon: FiInstagram, requiresLink: true },
    { value: 'ig_canal', label: 'Canal Comunicación IG', icon: FiInstagram, requiresLink: false },
    { value: 'email', label: 'Email Marketing', icon: FiMail, requiresLink: false },
    { value: 'pinterest', label: 'Pinterest', icon: FiImage, requiresLink: true },
    { value: 'tiktok', label: 'TikTok', icon: FiImage, requiresLink: true }
  ];

  // Determinar rol del usuario
  const esDiseño = userData?.areas?.some(area =>
    area.toLowerCase().includes('diseño') ||
    area.toLowerCase().includes('video') ||
    area.toLowerCase().includes('juli')
  );

  const esCommunity = userData?.areas?.some(area =>
    area.toLowerCase().includes('social') ||
    area.toLowerCase().includes('contenido') ||
    area.toLowerCase().includes('community') ||
    area.toLowerCase().includes('vicky') ||
    area.toLowerCase().includes('trini') ||
    area.toLowerCase().includes('email marketing') ||
    area.toLowerCase().includes('locales') ||
    area.toLowerCase().includes('x &')
  ) || userData?.name?.toLowerCase().includes('trini') || userData?.name?.toLowerCase().includes('vicky');

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const q = query(
      collection(db, 'marketingar_redes'),
      where('fecha', '>=', start),
      where('fecha', '<=', end),
      orderBy('fecha', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContenidos(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getContenidosForDate = (date) => {
    return contenidos
      .filter(c => {
        const cDate = c.fecha.toDate ? c.fecha.toDate() : new Date(c.fecha);
        return format(cDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return aTime - bTime;
      });
  };

  // Contenidos vencidos (fecha pasada y no publicados/cerrados)
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const contenidosVencidos = contenidos.filter(c => {
    const cDate = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha);
    return cDate < hoy && !['cerrado', 'publicado_parcial'].includes(c.estado);
  });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="redes-container">
      <div className="redes-header">
        <div>
          <h1>Calendario de Redes Sociales</h1>
          <p className="subtitle">Planificación mensual de contenido</p>
        </div>
        {canEdit && (
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
          >
            <FiPlus /> Nuevo Contenido
          </motion.button>
        )}
      </div>

      {/* Alerta de contenidos no publicados */}
      {contenidosVencidos.length > 0 && (
        <div className="redes-alerta-vencidos">
          <div className="alerta-header">
            <FiAlertTriangle />
            <strong>
              {contenidosVencidos.length} contenido{contenidosVencidos.length > 1 ? 's' : ''} sin publicar / sin marcar como publicado
            </strong>
          </div>
          <div className="alerta-lista">
            {contenidosVencidos.map(c => {
              const cDate = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha);
              return (
                <div
                  key={c.id}
                  className="alerta-item"
                  onClick={() => {
                    setEditingContenido(c);
                    setShowModal(true);
                  }}
                >
                  <span className="alerta-fecha">{format(cDate, 'd MMM', { locale: es })}</span>
                  <span className="alerta-idea">{c.idea}</span>
                  <span className="alerta-estado">{getEstadoLabel(c.estado)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="calendar-controls">
        <button className="btn-nav" onClick={prevMonth}>
          <FiChevronLeft />
        </button>
        <h2 className="calendar-month">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <button className="btn-nav" onClick={nextMonth}>
          <FiChevronRight />
        </button>
      </div>

      <div className="calendar-wrapper">
        <div className="calendar-header-row">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="calendar-header-day">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days-grid">
          {/* Espacios vacíos al inicio */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-day empty"></div>
          ))}

          {/* Días del mes */}
          {daysInMonth.map(date => {
            const dayContenidos = getContenidosForDate(date);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <motion.div
                key={date.toString()}
                className={`calendar-day ${isToday ? 'today' : ''}`}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  setSelectedDate(date);
                  setShowModal(true);
                }}
              >
                <div className="day-number">{format(date, 'd')}</div>
                <div className="day-contenidos">
                  {dayContenidos.map(contenido => (
                    <ContenidoItem
                      key={contenido.id}
                      contenido={contenido}
                      canales={canales}
                      onEdit={(cont) => {
                        setEditingContenido(cont);
                        setShowModal(true);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <NuevoContenidoModal
            onClose={() => {
              setShowModal(false);
              setSelectedDate(null);
              setEditingContenido(null);
            }}
            focos={focos}
            canales={canales}
            selectedDate={selectedDate}
            contenido={editingContenido}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ContenidoItem = ({ contenido, canales, onEdit }) => {
  const { isAdmin, isManager, isCoordinator } = useAuth();
  const canEditItem = (isAdmin || isCoordinator) && !isManager;
  const canOpenModal = !isManager; // Todos menos manager pueden abrir modal

  const getEstadoColor = () => {
    switch(contenido.estado) {
      case 'cerrado': return '#10b981';
      case 'publicado_parcial': return '#8b5cf6';
      case 'pendiente_publicacion': return '#f59e0b';
      case 'contenido_listo': return '#3b82f6';
      case 'en_diseno': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que quieres eliminar este contenido?')) {
      try {
        await deleteDoc(doc(db, 'marketingar_redes', contenido.id));
      } catch (error) {
        console.error('Error eliminando contenido:', error);
        alert('Error al eliminar el contenido');
      }
    }
  };

  return (
    <div
      className="contenido-item"
      style={{ borderLeftColor: getEstadoColor(), cursor: canOpenModal ? 'pointer' : 'default' }}
      onClick={(e) => {
        e.stopPropagation();
        if (canOpenModal) {
          onEdit(contenido);
        }
      }}
      title={canOpenModal ? `Estado: ${getEstadoLabel(contenido.estado)}` : `Estado: ${getEstadoLabel(contenido.estado)} (Solo lectura)`}
    >
      <div className="contenido-idea">{contenido.idea}</div>
      <div className="contenido-foco">
        <span className="foco-badge">{contenido.foco}</span>
      </div>
      <div className="contenido-canales">
        {contenido.canales?.map(canal => {
          const Icon = canales.find(c => c.value === canal)?.icon || FiImage;
          const pub = contenido.publicaciones?.[canal];
          return (
            <span key={canal} className={`canal-icon-wrapper ${pub?.publicado ? 'publicado' : ''}`}>
              <Icon className="canal-icon" />
              {pub?.publicado && <FiCheck className="check-icon" />}
            </span>
          );
        })}
      </div>
      {contenido.contenidoListo && (
        <div className="contenido-listo-badge">
          <FiCheck /> Listo
        </div>
      )}
      {canEditItem && (
        <button
          className="contenido-delete-btn"
          onClick={handleDelete}
          title="Eliminar contenido"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );
};

const NuevoContenidoModal = ({ onClose, focos, canales, selectedDate, contenido }) => {
  const { userData, isAdmin, isCoordinator } = useAuth();
  const canManage = isAdmin || isCoordinator;
  const [formData, setFormData] = useState(contenido ? {
    ...contenido,
    fecha: contenido.fecha ? formatDateForInput(contenido.fecha) : '',
    publicaciones: contenido.publicaciones || {},
    archivosDiseno: contenido.archivosDiseno || ''
  } : {
    fecha: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    idea: '',
    inspo: '',
    foco: focos[0],
    canales: [],
    aclaraciones: '',
    // Estados del flujo
    estado: 'pendiente_diseno',
    contenidoListo: false,
    archivosDiseno: '',
    publicaciones: {}, // { canal: { publicado: true/false, link: '' } }
    fechaCarga: null,
    emailEnviado: false
  });
  const [loading, setLoading] = useState(false);

  // Determinar rol del usuario
  const esDiseño = userData?.areas?.some(area =>
    area.toLowerCase().includes('diseño') ||
    area.toLowerCase().includes('video') ||
    area.toLowerCase().includes('juli')
  );

  const esCommunity = userData?.areas?.some(area =>
    area.toLowerCase().includes('social') ||
    area.toLowerCase().includes('contenido') ||
    area.toLowerCase().includes('community') ||
    area.toLowerCase().includes('vicky') ||
    area.toLowerCase().includes('trini') ||
    area.toLowerCase().includes('email marketing') ||
    area.toLowerCase().includes('locales') ||
    area.toLowerCase().includes('x &')
  ) || userData?.name?.toLowerCase().includes('trini') || userData?.name?.toLowerCase().includes('vicky');

  const handleCanalToggle = (canal) => {
    setFormData(prev => ({
      ...prev,
      canales: prev.canales.includes(canal)
        ? prev.canales.filter(c => c !== canal)
        : [...prev.canales, canal]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fechaPublicacion = parseLocalDate(formData.fecha);
      const fechaCarga = new Date(fechaPublicacion);
      fechaCarga.setDate(fechaCarga.getDate() - 1); // Día anterior

      // Calcular estado automático
      let estadoAutomatico = 'pendiente_diseno';
      if (formData.contenidoListo) {
        const publicacionesCompletas = formData.canales.every(canal => {
          const pub = formData.publicaciones[canal];
          const canalInfo = canales.find(c => c.value === canal);
          if (!pub) return false;
          if (canalInfo.requiresLink && !pub.link) return false;
          return pub.publicado;
        });

        if (publicacionesCompletas) {
          estadoAutomatico = 'cerrado';
        } else if (Object.keys(formData.publicaciones).some(c => formData.publicaciones[c]?.publicado)) {
          estadoAutomatico = 'publicado_parcial';
        } else {
          estadoAutomatico = 'pendiente_publicacion';
        }
      } else if (formData.archivosDiseno) {
        estadoAutomatico = 'en_diseno';
      }

      const contenidoData = {
        ...formData,
        fecha: fechaPublicacion,
        fechaCarga: fechaCarga,
        estado: estadoAutomatico
      };

      if (contenido) {
        // Editar contenido existente
        const { id, ...updateData } = contenidoData;
        await updateDoc(doc(db, 'marketingar_redes', contenido.id), updateData);
      } else {
        // Crear nuevo contenido
        await addDoc(collection(db, 'marketingar_redes'), {
          ...contenidoData,
          creadoPor: userData.name,
          creadoId: userData.id,
          createdAt: new Date()
        });
      }
      onClose();
    } catch (error) {
      console.error('Error guardando contenido:', error);
      alert('Error al guardar el contenido');
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
        className="modal-content large"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{contenido ? 'Editar Contenido' : 'Nuevo Contenido'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* SECCIÓN 1: DATOS PRINCIPALES (Solo Admin) */}
          <div className="form-section">
            <h3>Información del Contenido</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Publicación *</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                  disabled={!canManage && contenido}
                />
                <small>Fecha de carga: {formData.fecha ? new Date(parseLocalDate(formData.fecha).getTime() - 86400000).toLocaleDateString('es-AR') : '-'}</small>
              </div>

              <div className="form-group">
                <label>Foco *</label>
                <select
                  value={formData.foco}
                  onChange={(e) => setFormData({ ...formData, foco: e.target.value })}
                  required
                  disabled={!canManage && contenido}
                >
                  {focos.map(foco => (
                    <option key={foco} value={foco}>{foco}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Idea / Concepto *</label>
              <textarea
                value={formData.idea}
                onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                required
                rows="2"
                placeholder="Descripción del contenido..."
                disabled={!canManage && contenido}
              />
            </div>

            <div className="form-group">
              <label>Inspiración</label>
              <input
                type="text"
                value={formData.inspo}
                onChange={(e) => setFormData({ ...formData, inspo: e.target.value })}
                placeholder="Link de inspiración o referencia..."
                disabled={!canManage && contenido}
              />
            </div>

            <div className="form-group">
              <label>Canales * {!canManage && contenido && '(solo lectura)'}</label>
              <div className="canales-grid">
                {canales.map(canal => (
                  <button
                    key={canal.value}
                    type="button"
                    className={`canal-button ${formData.canales.includes(canal.value) ? 'active' : ''}`}
                    onClick={() => !(!canManage && contenido) && handleCanalToggle(canal.value)}
                    disabled={!canManage && contenido}
                  >
                    <canal.icon />
                    <span>{canal.label}</span>
                    {canal.requiresLink && <small>(link)</small>}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Aclaraciones</label>
              <textarea
                value={formData.aclaraciones}
                onChange={(e) => setFormData({ ...formData, aclaraciones: e.target.value })}
                rows="2"
                placeholder="Detalles adicionales..."
                disabled={!canManage && contenido}
              />
            </div>
          </div>

          {/* SECCIÓN 2: DISEÑO (Juli) */}
          {(esDiseño || esCommunity || canManage) && contenido && (
            <div className="form-section diseno-section">
              <h3>📐 Diseño y Contenido</h3>

              <div className="form-group">
                <label>Archivos de Diseño</label>
                <input
                  type="text"
                  value={formData.archivosDiseno}
                  onChange={(e) => setFormData({ ...formData, archivosDiseno: e.target.value })}
                  placeholder="Link a Drive, Dropbox, etc..."
                  disabled={!esDiseño && !canManage}
                />
                {esCommunity && !esDiseño && !isAdmin && (
                  <small style={{color: '#666', fontSize: '12px'}}>Solo lectura - Editado por Diseño</small>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.contenidoListo}
                    onChange={(e) => setFormData({ ...formData, contenidoListo: e.target.checked })}
                    disabled={!esDiseño && !canManage}
                  />
                  <FiCheck /> <strong>Contenido listo para publicar</strong>
                </label>
                {esDiseño || canManage ? (
                  <small>⚠️ Hasta que no marques esto, Vicky y Trini no pueden publicar</small>
                ) : (
                  <small style={{color: formData.contenidoListo ? '#10b981' : '#f59e0b'}}>
                    {formData.contenidoListo ? '✓ Contenido disponible para publicar' : '⏳ Esperando aprobación de Diseño'}
                  </small>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: PUBLICACIÓN (Vicky/Trini) */}
          {(esCommunity || canManage) && contenido && (
            <div className="form-section publicacion-section">
              <h3>📱 Publicación por Canal</h3>

              {!formData.contenidoListo && !canManage && esCommunity && (
                <div className="alert-warning">
                  ⏳ Nota: Algunas opciones están bloqueadas hasta que Diseño marque "Contenido listo".
                  Puedes marcar Email Marketing como enviado si ya lo hiciste.
                </div>
              )}

              {formData.canales.map(canalValue => {
                const canalInfo = canales.find(c => c.value === canalValue);
                const pub = formData.publicaciones[canalValue] || { publicado: false, link: '' };
                const bloqueado = !formData.contenidoListo && !canManage;

                return (
                  <div key={canalValue} className="canal-publicacion-item">
                    <div className="canal-publicacion-header">
                      <canalInfo.icon />
                      <strong>{canalInfo.label}</strong>
                    </div>

                    <div className="canal-publicacion-controls">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={pub.publicado}
                          onChange={(e) => setFormData({
                            ...formData,
                            publicaciones: {
                              ...formData.publicaciones,
                              [canalValue]: { ...pub, publicado: e.target.checked }
                            }
                          })}
                          disabled={bloqueado}
                        />
                        <FiCheck /> Publicado
                      </label>

                      {canalInfo.requiresLink && (
                        <input
                          type="url"
                          value={pub.link || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            publicaciones: {
                              ...formData.publicaciones,
                              [canalValue]: { ...pub, link: e.target.value }
                            }
                          })}
                          placeholder="https://..."
                          disabled={bloqueado}
                          required={pub.publicado}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {formData.canales.includes('email') && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.emailEnviado}
                      onChange={(e) => setFormData({ ...formData, emailEnviado: e.target.checked })}
                      disabled={false}
                    />
                    <FiCheck /> Email enviado
                  </label>
                  <small style={{color: '#666', fontSize: '12px'}}>Puedes marcar esto independientemente del estado del contenido</small>
                </div>
              )}
            </div>
          )}

          {/* Estado actual (visible para todos) */}
          {contenido && (
            <div className="form-section estado-section">
              <h3>Estado: <span className={`estado-badge ${formData.estado}`}>{getEstadoLabel(formData.estado)}</span></h3>
            </div>
          )}

          <div className="modal-actions">
            {canManage && contenido && (
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  if (window.confirm('¿Estás segura de eliminar este contenido? No se puede deshacer.')) {
                    try {
                      await deleteDoc(doc(db, 'marketingar_redes', contenido.id));
                      onClose();
                    } catch (error) {
                      console.error('Error eliminando:', error);
                      alert('Error al eliminar el contenido');
                    }
                  }
                }}
              >
                Eliminar
              </button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : (contenido ? 'Actualizar' : 'Guardar Contenido')}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Función auxiliar para labels de estados
const getEstadoLabel = (estado) => {
  const estados = {
    'pendiente_diseno': 'Pendiente de diseño',
    'en_diseno': 'En diseño',
    'contenido_listo': 'Contenido listo',
    'pendiente_publicacion': 'Pendiente de publicación',
    'publicado_parcial': 'Publicado parcialmente',
    'cerrado': 'Publicado / Cerrado'
  };
  return estados[estado] || estado;
};

export default Redes;
