import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { parseLocalDateTime, formatDateForInput, formatTimeForInput } from '../../utils/dateUtils';
import { notificarParticipantes } from '../../utils/notificaciones';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiCalendar,
  FiClock,
  FiUsers,
  FiLink,
  FiX,
  FiCoffee,
  FiStar,
  FiBriefcase,
  FiCamera,
  FiTrash2,
  FiInfo,
  FiTag,
  FiMap,
  FiHome,
  FiKey,
  FiPackage,
  FiShoppingCart,
  FiZap
} from 'react-icons/fi';
import { 
  format, 
  addDays, 
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import './Calendario.css';

const Calendario = () => {
  const { isAdmin, userData, isManager } = useAuth();
  const [vistaActual, setVistaActual] = useState('semanal'); // semanal, mensual, anual
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date());
  const [eventos, setEventos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = !isManager; // Manager solo puede ver

  const tiposEvento = [
    { value: 'accion',           label: 'Acción',             icon: FiBriefcase,    color: '#8b5cf6' },
    { value: 'evento',           label: 'Eventos',            icon: FiStar,         color: '#f59e0b' },
    { value: 'lanzamiento',      label: 'Lanzamientos',       icon: FiZap,          color: '#ef4444' },
    { value: 'importacion',      label: 'Importaciones',      icon: FiPackage,      color: '#3b82f6' },
    { value: 'vacaciones',       label: 'Vacaciones',         icon: FiCoffee,       color: '#06b6d4' },
    { value: 'fecha_comercial',  label: 'Fecha comercial',    icon: FiTag,          color: '#ec4899' },
    { value: 'evento_comercial', label: 'Evento comercial',   icon: FiShoppingCart, color: '#f97316' },
    { value: 'feria',            label: 'Ferias',             icon: FiMap,          color: '#10b981' },
    { value: 'nuevo_local',      label: 'Nuevos locales',     icon: FiHome,         color: '#6366f1' },
    { value: 'apertura',         label: 'Aperturas',          icon: FiKey,          color: '#462829' },
  ];

  useEffect(() => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

    const q = query(
      collection(db, 'marketingar_calendario'),
      where('fecha', '>=', weekStart),
      where('fecha', '<=', weekEnd),
      orderBy('fecha', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventos(eventosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentWeek]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventosForDate = (date) => {
    return eventos.filter(e => {
      const eDate = e.fecha.toDate ? e.fecha.toDate() : new Date(e.fecha);
      return isSameDay(eDate, date);
    });
  };

  const getTipoEvento = (tipo) => {
    return tiposEvento.find(t => t.value === tipo) || tiposEvento[0];
  };

  // Navegación para diferentes vistas
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const todayWeek = () => setCurrentWeek(new Date());
  
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const todayMonth = () => setCurrentMonth(new Date());
  
  const prevYear = () => setCurrentYear(subYears(currentYear, 1));
  const nextYear = () => setCurrentYear(addYears(currentYear, 1));
  const todayYear = () => setCurrentYear(new Date());
  
  // Obtener días del mes para vista mensual
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  
  // Obtener meses del año para vista anual
  const yearMonths = eachMonthOfInterval({
    start: startOfYear(currentYear),
    end: endOfYear(currentYear)
  });
  
  // Verificar si el usuario puede editar un evento
  const puedeEditar = (evento) => {
    if (isAdmin) return true;
    return evento.creadoId === userData?.id;
  };

  return (
    <div className="calendario-container">
      <div className="calendario-header">
        <div>
          <h1>Calendario Grupal</h1>
          <p className="subtitle">Eventos y actividades del equipo</p>
        </div>
        <div className="header-actions">
          <div className="vista-selector">
            <button 
              className={vistaActual === 'semanal' ? 'active' : ''}
              onClick={() => setVistaActual('semanal')}
            >
              Semanal
            </button>
            <button 
              className={vistaActual === 'mensual' ? 'active' : ''}
              onClick={() => setVistaActual('mensual')}
            >
              Mensual
            </button>
            <button 
              className={vistaActual === 'anual' ? 'active' : ''}
              onClick={() => setVistaActual('anual')}
            >
              Anual
            </button>
          </div>
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
          >
            <FiPlus /> Nuevo Evento
          </motion.button>
        </div>
      </div>

      {/* AVISO: Solo acciones estratégicas */}
      <div className="calendario-estrategico-notice">
        <FiInfo />
        <span>En este calendario solo se cargan <strong>acciones estratégicas</strong>. Las reuniones se registran en la sección Reuniones.</span>
      </div>

      {/* VISTA SEMANAL */}
      {vistaActual === 'semanal' && (
        <>
          <div className="week-controls">
            <button className="btn-nav" onClick={prevWeek}>←</button>
            <div className="week-info">
              <h2>
                {format(weekDays[0], 'd MMM', { locale: es })} - {format(weekDays[6], 'd MMM yyyy', { locale: es })}
              </h2>
              <button className="btn-today" onClick={todayWeek}>Hoy</button>
            </div>
            <button className="btn-nav" onClick={nextWeek}>→</button>
          </div>

          <div className="week-grid">
            {weekDays.map(date => {
              const dayEventos = getEventosForDate(date);
              const isToday = isSameDay(date, new Date());

              return (
                <motion.div
                  key={date.toString()}
                  className={`week-day ${isToday ? 'today' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="day-header">
                    <div className="day-name">{format(date, 'EEEE', { locale: es })}</div>
                    <div className={`day-date ${isToday ? 'today-number' : ''}`}>
                      {format(date, 'd')}
                    </div>
                  </div>

                  <div className="day-eventos">
                    {dayEventos.length === 0 ? (
                      <div className="no-eventos">
                        Sin eventos
                      </div>
                    ) : (
                      dayEventos.map(evento => {
                        const tipo = getTipoEvento(evento.tipo);
                        const Icon = tipo.icon;
                        const canEdit = puedeEditar(evento);
                        
                        return (
                          <motion.div
                            key={evento.id}
                            className={`evento-card ${!canEdit ? 'readonly' : ''}`}
                            style={{ borderLeftColor: tipo.color }}
                            whileHover={{ scale: canEdit ? 1.02 : 1 }}
                            layout
                          >
                            <div className="evento-icon" style={{ background: tipo.color }}>
                              <Icon />
                            </div>
                            <div 
                              className="evento-content"
                              onClick={() => {
                                if (canEdit) {
                                  setEditingEvento(evento);
                                  setShowModal(true);
                                }
                              }}
                            >
                              <div className="evento-titulo">
                                {evento.titulo}
                                {!canEdit && <span className="evento-readonly-badge">👁️</span>}
                              </div>
                              {evento.hora && (
                                <div className="evento-hora">
                                  <FiClock /> {evento.hora}
                                </div>
                              )}
                              {evento.participantes && evento.participantes.length > 0 && (
                                <div className="evento-participantes">
                                  <FiUsers /> {evento.participantes.join(', ')}
                                </div>
                              )}
                              {evento.descripcion && (
                                <div className="evento-has-notes">📝 Tiene notas</div>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                className="evento-delete-btn"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('¿Seguro que quieres eliminar este evento?')) {
                                    try {
                                      await deleteDoc(doc(db, 'marketingar_calendario', evento.id));
                                    } catch (error) {
                                      console.error('Error eliminando evento:', error);
                                      alert('Error al eliminar el evento');
                                    }
                                  }
                                }}
                                title="Eliminar evento"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  <button
                    className="add-evento-btn"
                    onClick={() => {
                      setSelectedDate(date);
                      setShowModal(true);
                    }}
                  >
                    <FiPlus /> Agregar
                  </button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* VISTA MENSUAL */}
      {vistaActual === 'mensual' && (
        <>
          <div className="week-controls">
            <button className="btn-nav" onClick={prevMonth}>←</button>
            <div className="week-info">
              <h2>{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
              <button className="btn-today" onClick={todayMonth}>Este mes</button>
            </div>
            <button className="btn-nav" onClick={nextMonth}>→</button>
          </div>

          <div className="month-scroll-wrapper">
          <div className="month-grid">
            <div className="month-header-row">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="month-header-day">{day}</div>
              ))}
            </div>
            
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="month-day empty"></div>
            ))}
            
            {/* Días del mes */}
            {monthDays.map(date => {
              const dayEventos = getEventosForDate(date);
              const isToday = isSameDay(date, new Date());
              
              return (
                <motion.div
                  key={date.toString()}
                  className={`month-day ${isToday ? 'today' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    setSelectedDate(date);
                    setShowModal(true);
                  }}
                >
                  <div className="month-day-number">{format(date, 'd')}</div>
                  <div className="month-day-eventos">
                    {dayEventos.slice(0, 3).map(evento => {
                      const tipo = getTipoEvento(evento.tipo);
                      return (
                        <div
                          key={evento.id}
                          className="month-evento-badge"
                          style={{ background: tipo.color }}
                          title={evento.titulo}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (puedeEditar(evento)) {
                              setEditingEvento(evento);
                              setShowModal(true);
                            }
                          }}
                        >
                          {evento.titulo.substring(0, 15)}...
                        </div>
                      );
                    })}
                    {dayEventos.length > 3 && (
                      <div className="month-evento-more">+{dayEventos.length - 3} más</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          </div>
        </>
      )}

      {/* VISTA ANUAL */}
      {vistaActual === 'anual' && (
        <>
          <div className="week-controls">
            <button className="btn-nav" onClick={prevYear}>←</button>
            <div className="week-info">
              <h2>{format(currentYear, 'yyyy')}</h2>
              <button className="btn-today" onClick={todayYear}>Este año</button>
            </div>
            <button className="btn-nav" onClick={nextYear}>→</button>
          </div>

          <div className="year-grid">
            {yearMonths.map(month => {
              const monthStart = startOfMonth(month);
              const monthEnd = endOfMonth(month);
              const eventosDelMes = eventos.filter(e => {
                const eventoDate = new Date(e.fecha);
                return eventoDate >= monthStart && eventoDate <= monthEnd;
              });
              
              return (
                <motion.div
                  key={month.toString()}
                  className="year-month-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setCurrentMonth(month);
                    setVistaActual('mensual');
                  }}
                >
                  <div className="year-month-header">
                    {format(month, 'MMMM', { locale: es })}
                  </div>
                  <div className="year-month-count">
                    {eventosDelMes.length} {eventosDelMes.length === 1 ? 'evento' : 'eventos'}
                  </div>
                  <div className="year-month-tipos">
                    {tiposEvento.map(tipo => {
                      const count = eventosDelMes.filter(e => e.tipo === tipo.value).length;
                      if (count === 0) return null;
                      const Icon = tipo.icon;
                      return (
                        <div key={tipo.value} className="year-tipo-badge" style={{ background: tipo.color }}>
                          <Icon /> {count}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <NuevoEventoModal
            onClose={() => {
              setShowModal(false);
              setSelectedDate(null);
              setEditingEvento(null);
            }}
            tiposEvento={tiposEvento}
            selectedDate={selectedDate}
            evento={editingEvento}
            puedeEditar={editingEvento ? puedeEditar(editingEvento) : true}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NuevoEventoModal = ({ onClose, tiposEvento, selectedDate, evento, puedeEditar }) => {
  const { userData, isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState(evento ? {
    ...evento,
    fechaInicio: evento.fechaInicio ? formatDateForInput(evento.fechaInicio) : (evento.fecha ? formatDateForInput(evento.fecha) : ''),
    fechaFin: evento.fechaFin ? formatDateForInput(evento.fechaFin) : '',
    hora: evento.fecha ? formatTimeForInput(evento.fecha) : '',
    participantes: evento.participantes || []
  } : {
    titulo: '',
    tipo: 'accion',
    fechaInicio: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    fechaFin: '',
    hora: '',
    descripcion: '',
    participantes: [],
    links: '',
    adjuntos: ''
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'marketingar_users'), where('active', '==', true)),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsuarios(users);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleParticipanteToggle = (nombre) => {
    setFormData(prev => ({
      ...prev,
      participantes: prev.participantes.includes(nombre)
        ? prev.participantes.filter(p => p !== nombre)
        : [...prev.participantes, nombre]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEditar && evento) {
      alert('No tienes permiso para editar este evento');
      return;
    }
    setLoading(true);

    try {
      const fechaInicio = parseLocalDateTime(formData.fechaInicio, formData.hora);
      const fechaFin = formData.fechaFin ? parseLocalDateTime(formData.fechaFin, formData.hora) : null;

      if (evento) {
        // Editar evento existente
        const eventoData = {
          ...formData,
          fecha: fechaInicio,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin
        };
        const { id, ...updateData } = eventoData;
        await updateDoc(doc(db, 'marketingar_calendario', evento.id), updateData);
      } else {
        // Crear nuevo evento (puede ser múltiple si hay rango de fechas)
        if (fechaFin && fechaFin > fechaInicio) {
          // Crear un evento para cada día del rango
          const dias = eachDayOfInterval({ start: fechaInicio, end: fechaFin });
          const promises = dias.map(dia => 
            addDoc(collection(db, 'marketingar_calendario'), {
              titulo: formData.titulo,
              tipo: formData.tipo,
              fecha: dia,
              fechaInicio: fechaInicio,
              fechaFin: fechaFin,
              hora: formData.hora,
              descripcion: formData.descripcion,
              participantes: formData.participantes,
              links: formData.links,
              adjuntos: formData.adjuntos,
              creadoPor: userData.name,
              creadoId: userData.id,
              createdAt: new Date()
            })
          );
          await Promise.all(promises);
          // Notificar participantes (solo al crear, no editar)
          if (formData.participantes?.length) {
            notificarParticipantes(formData.participantes, {
              tipo: 'calendario',
              titulo: formData.titulo,
              mensaje: `${userData.name} te agregó a un evento`,
              creadoPor: userData.name,
            }).catch(() => {});
          }
        } else {
          // Evento de un solo día
          await addDoc(collection(db, 'marketingar_calendario'), {
            ...formData,
            fecha: fechaInicio,
            fechaInicio: fechaInicio,
            fechaFin: null,
            creadoPor: userData.name,
            creadoId: userData.id,
            createdAt: new Date()
          });
          // Notificar participantes
          if (formData.participantes?.length) {
            notificarParticipantes(formData.participantes, {
              tipo: 'calendario',
              titulo: formData.titulo,
              mensaje: `${userData.name} te agregó a un evento`,
              creadoPor: userData.name,
            }).catch(() => {});
          }
        }
      }
      onClose();
    } catch (error) {
      console.error('Error guardando evento:', error);
      alert('Error al guardar el evento');
    }
    setLoading(false);
  };
  
  const handleDelete = async () => {
    if (!puedeEditar) {
      alert('No tienes permiso para eliminar este evento');
      return;
    }
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'marketingar_calendario', evento.id));
      onClose();
    } catch (error) {
      console.error('Error eliminando evento:', error);
      alert('Error al eliminar el evento');
    }
    setLoading(false);
  };

  const tipoSeleccionado = tiposEvento.find(t => t.value === formData.tipo) || tiposEvento[0];

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
          <h2>{evento ? 'Editar Evento' : 'Nuevo Evento'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {evento && !puedeEditar && (
            <div className="alert-info">
              👁️ Solo puedes ver este evento. No tienes permiso para editarlo.
            </div>
          )}
          
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              required
              placeholder="Ej: Reunión de equipo"
              disabled={evento && !puedeEditar}
            />
          </div>

          <div className="form-group">
            <label>Tipo de evento *</label>
            <div className="tipos-grid">
              {tiposEvento.map(tipo => {
                const Icon = tipo.icon;
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    className={`tipo-button ${formData.tipo === tipo.value ? 'selected' : ''}`}
                    style={{
                      borderColor: formData.tipo === tipo.value ? tipo.color : '#e0e0e0',
                      background: formData.tipo === tipo.value ? tipo.color : 'white',
                      color: formData.tipo === tipo.value ? 'white' : '#666'
                    }}
                    onClick={() => setFormData({ ...formData, tipo: tipo.value })}
                    disabled={evento && !puedeEditar}
                  >
                    <Icon />
                    {tipo.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de inicio *</label>
              <input
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                required
                disabled={evento && !puedeEditar}
              />
            </div>

            <div className="form-group">
              <label>Fecha de fin (opcional)</label>
              <input
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                min={formData.fechaInicio}
                disabled={evento && !puedeEditar}
              />
              <small style={{color: '#999', fontSize: '12px'}}>Para eventos de varios días (vacaciones, etc.)</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hora (opcional)</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                disabled={evento && !puedeEditar}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows="3"
              placeholder="Detalles del evento..."
              disabled={evento && !puedeEditar}
            />
          </div>

          <div className="form-group">
            <label>Participantes</label>
            <div className="participantes-grid">
              {usuarios.map(user => (
                <label key={user.id} className="participante-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.participantes.includes(user.name)}
                    onChange={() => handleParticipanteToggle(user.name)}
                    disabled={evento && !puedeEditar}
                  />
                  {user.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Links / adjuntos</label>
            <input
              type="text"
              value={formData.links}
              onChange={(e) => setFormData({ ...formData, links: e.target.value })}
              placeholder="URLs separadas por comas"
              disabled={evento && !puedeEditar}
            />
          </div>

          <div className="modal-actions">
            {evento && puedeEditar && (
              <>
                {!showDeleteConfirm ? (
                  <button 
                    type="button" 
                    className="btn-danger" 
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <FiTrash2 /> Eliminar
                  </button>
                ) : (
                  <div className="delete-confirm">
                    <span>¿Seguro?</span>
                    <button 
                      type="button" 
                      className="btn-danger-confirm" 
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      Sí, eliminar
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
            <div style={{ flex: 1 }}></div>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {evento && !puedeEditar ? 'Cerrar' : 'Cancelar'}
            </button>
            {puedeEditar && (
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : (evento ? 'Actualizar' : 'Crear Evento')}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Calendario;
