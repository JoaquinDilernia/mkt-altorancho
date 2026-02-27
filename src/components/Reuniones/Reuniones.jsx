import { useState, useEffect, useRef } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, where, getDocs, orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { notificarParticipantes } from '../../utils/notificaciones';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiChevronLeft, FiChevronRight, FiX, FiVideo,
  FiMapPin, FiSave, FiTrash2, FiAlertCircle, FiAlertTriangle,
  FiLink, FiClock, FiInfo
} from 'react-icons/fi';
import './Reuniones.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END   = 22;
const PX_PER_HOUR = 64;
const PX_PER_MIN  = PX_PER_HOUR / 60;

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ABREV  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAY_KEYS    = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];

// ── Pure helpers ──────────────────────────────────────────────────────────────
const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonday = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = date.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diff);
  return date;
};

const getWeekDays = (monday) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Cluster-based column layout for overlap-free positioning
const layoutMeetings = (meetings) => {
  if (!meetings.length) return {};
  const sorted = [...meetings].sort((a, b) =>
    a.horaInicio !== b.horaInicio
      ? a.horaInicio.localeCompare(b.horaInicio)
      : a.horaFin.localeCompare(b.horaFin)
  );
  const layout = {};
  let i = 0;
  while (i < sorted.length) {
    const cluster = [sorted[i]];
    let clusterEnd = sorted[i].horaFin;
    i++;
    while (i < sorted.length && sorted[i].horaInicio < clusterEnd) {
      cluster.push(sorted[i]);
      if (sorted[i].horaFin > clusterEnd) clusterEnd = sorted[i].horaFin;
      i++;
    }
    const cols = [];
    cluster.forEach(m => {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c][cols[c].length - 1].horaFin <= m.horaInicio) {
          cols[c].push(m);
          layout[m.id] = { colIdx: c, totalCols: 0 };
          placed = true;
          break;
        }
      }
      if (!placed) {
        layout[m.id] = { colIdx: cols.length, totalCols: 0 };
        cols.push([m]);
      }
    });
    cluster.forEach(m => { layout[m.id].totalCols = cols.length; });
  }
  return layout;
};

const getMeetingStyle = (horaInicio, horaFin, colIdx, totalCols) => {
  const startMins = timeToMins(horaInicio);
  const endMins   = timeToMins(horaFin);
  const top    = (startMins - HOUR_START * 60) * PX_PER_MIN;
  const height = Math.max(22, (endMins - startMins) * PX_PER_MIN);
  const pct    = 100 / totalCols;
  return {
    top:    `${top}px`,
    height: `${height}px`,
    left:   `calc(${colIdx * pct}% + 2px)`,
    width:  `calc(${pct}% - 4px)`,
  };
};

const getDayKey = (date) => DAY_KEYS[date.getDay() === 0 ? 6 : date.getDay() - 1];

const isDisponible = (usuario, fechaStr, horaInicio, horaFin) => {
  const exc = (usuario.excepciones || []).find(e => e.fecha === fechaStr);
  if (exc !== undefined) return exc.disponible;
  const semanal = usuario.disponibilidadSemanal;
  if (!semanal) return true;
  const dayKey = getDayKey(new Date(fechaStr + 'T12:00:00'));
  const slot = semanal[dayKey];
  if (!slot || !slot.activo) return false;
  return horaInicio >= slot.inicio && horaFin <= slot.fin;
};

// ── Main component ────────────────────────────────────────────────────────────
const Reuniones = () => {
  const { userData } = useAuth();
  const [weekStart, setWeekStart]       = useState(getMonday());
  const [reuniones, setReuniones]       = useState([]);
  const [salas, setSalas]               = useState([]);
  const [usuarios, setUsuarios]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editingReunion, setEditingReunion] = useState(null);
  const [prefill, setPrefill]           = useState(null);
  const scrollRef = useRef(null);

  const weekDays     = getWeekDays(weekStart);
  const weekStartStr = toDateStr(weekDays[0]);
  const weekEndStr   = toDateStr(weekDays[6]);
  const todayStr     = toDateStr(new Date());

  // ── Listeners ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'marketingar_reuniones'),
      where('fecha', '>=', weekStartStr),
      where('fecha', '<=', weekEndStr)
    );
    const unsub = onSnapshot(q, snap => {
      setReuniones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'marketingar_salas'), orderBy('nombre')),
      snap => setSalas(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.activa !== false)
      )
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'marketingar_users'), where('active', '==', true)),
      snap => setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, []);

  // Scroll to 9 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (9 - HOUR_START) * PX_PER_HOUR - 20;
    }
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevWeek  = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  const nextWeek  = () => setWeekStart(p => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });
  const goToday   = () => setWeekStart(getMonday());

  const openNew = (date = null, horaInicio = null, horaFin = null) => {
    setEditingReunion(null);
    setPrefill({ date: date || todayStr, horaInicio: horaInicio || '09:00', horaFin: horaFin || '10:00' });
    setShowModal(true);
  };

  const handleDelete = async (id, titulo) => {
    if (!confirm(`¿Eliminar la reunión "${titulo}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'marketingar_reuniones', id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;

  const monthLabel = (() => {
    const sm = weekDays[0].getMonth(), em = weekDays[6].getMonth();
    const y  = weekDays[0].getFullYear();
    return sm === em ? `${MONTHS[sm]} ${y}` : `${MONTHS[sm]} – ${MONTHS[em]} ${y}`;
  })();

  return (
    <div className="reuniones-page">
      {/* ── Header ── */}
      <div className="reuniones-header">
        <div className="reuniones-title-area">
          <h1>Reuniones</h1>
          <span className="week-month-label">{monthLabel}</span>
        </div>
        <div className="reuniones-nav">
          <button className="btn-nav" onClick={prevWeek} title="Semana anterior"><FiChevronLeft /></button>
          <button className="btn-today" onClick={goToday}>Hoy</button>
          <button className="btn-nav" onClick={nextWeek} title="Semana siguiente"><FiChevronRight /></button>
          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openNew()}
          >
            <FiPlus /> Nueva Reunión
          </motion.button>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="calendar-wrapper">
        {/* Day headers */}
        <div className="calendar-header-row">
          <div className="time-gutter-header" />
          {weekDays.map((day, idx) => {
            const dateStr  = toDateStr(day);
            const isToday  = dateStr === todayStr;
            const dayCount = reuniones.filter(r => r.fecha === dateStr).length;
            return (
              <div
                key={idx}
                className={`day-header-cell ${isToday ? 'today' : ''}`}
                onClick={() => openNew(dateStr)}
                title={`Nueva reunión`}
              >
                <span className="day-abbrev">{DAYS_ABREV[idx]}</span>
                <span className={`day-num ${isToday ? 'today-circle' : ''}`}>
                  {day.getDate()}
                </span>
                {dayCount > 0 && (
                  <span className="day-event-count">{dayCount}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable grid */}
        <div className="calendar-scroll" ref={scrollRef}>
          <div className="calendar-grid" style={{ height: `${totalHeight}px` }}>

            {/* Time gutter */}
            <div className="time-gutter-body">
              {hours.map(h => (
                <div
                  key={h}
                  className="time-label"
                  style={{ top: `${(h - HOUR_START) * PX_PER_HOUR}px` }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const dateStr    = toDateStr(day);
              const dayMtgs    = reuniones.filter(r => r.fecha === dateStr);
              const mlayout    = layoutMeetings(dayMtgs);
              const isToday    = dateStr === todayStr;

              return (
                <div key={dayIdx} className={`day-col ${isToday ? 'today-col' : ''}`}>
                  {/* Hour cells (clickable) */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="hour-cell"
                      style={{ top: `${(h - HOUR_START) * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                      onClick={() => openNew(
                        dateStr,
                        `${String(h).padStart(2,'0')}:00`,
                        `${String(Math.min(h + 1, HOUR_END)).padStart(2,'0')}:00`
                      )}
                    />
                  ))}

                  {/* Meeting cards */}
                  {dayMtgs.map(reunion => {
                    const lyt   = mlayout[reunion.id] || { colIdx: 0, totalCols: 1 };
                    const style = getMeetingStyle(reunion.horaInicio, reunion.horaFin, lyt.colIdx, lyt.totalCols);
                    const sala  = salas.find(s => s.id === reunion.salaId);
                    const color = reunion.tipo === 'presencial'
                      ? (sala?.color || '#462829')
                      : '#3b82f6';

                    return (
                      <motion.div
                        key={reunion.id}
                        className="meeting-card"
                        style={{ ...style, '--meeting-color': color }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={e => {
                          e.stopPropagation();
                          setEditingReunion(reunion);
                          setPrefill(null);
                          setShowModal(true);
                        }}
                        title={reunion.titulo}
                      >
                        <div className="mc-title">{reunion.titulo}</div>
                        <div className="mc-meta">
                          <FiClock size={9} />
                          {reunion.horaInicio}–{reunion.horaFin}
                        </div>
                        {reunion.tipo === 'presencial' && sala && (
                          <div className="mc-sala">
                            <FiMapPin size={9} /> {sala.nombre}
                          </div>
                        )}
                        {reunion.tipo === 'virtual' && (
                          <div className="mc-sala">
                            <FiVideo size={9} /> Virtual
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading && <div className="cal-loading">Cargando...</div>}

      <AnimatePresence>
        {showModal && (
          <ReunionModal
            reunion={editingReunion}
            prefill={prefill}
            salas={salas}
            usuarios={usuarios}
            currentUser={userData}
            onClose={() => { setShowModal(false); setEditingReunion(null); setPrefill(null); }}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── ReunionModal ──────────────────────────────────────────────────────────────
const ReunionModal = ({ reunion, prefill, salas, usuarios, currentUser, onClose, onDelete }) => {
  const isEditing = !!reunion;

  const [formData, setFormData] = useState(() => {
    if (reunion) return {
      titulo:       reunion.titulo       || '',
      descripcion:  reunion.descripcion  || '',
      tipo:         reunion.tipo         || 'presencial',
      salaId:       reunion.salaId       || '',
      fecha:        reunion.fecha        || toDateStr(new Date()),
      horaInicio:   reunion.horaInicio   || '09:00',
      horaFin:      reunion.horaFin      || '10:00',
      participantes: reunion.participantes || [],
      linkMeet:     reunion.linkMeet     || '',
      notas:        reunion.notas        || '',
    };
    return {
      titulo: '', descripcion: '', tipo: 'presencial', salaId: '',
      fecha:      prefill?.date        || toDateStr(new Date()),
      horaInicio: prefill?.horaInicio  || '09:00',
      horaFin:    prefill?.horaFin     || '10:00',
      participantes: [{
        id: currentUser.id,
        nombre: currentUser.name,
        photoURL: currentUser.photoURL || null
      }],
      linkMeet: '', notas: '',
    };
  });

  const [tab, setTab]             = useState('info');
  const [loading, setLoading]     = useState(false);
  const [hardConflicts, setHardConflicts] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Availability warnings (soft)
  const warnings = (() => {
    if (!formData.fecha || !formData.horaInicio || !formData.horaFin) return [];
    return formData.participantes.filter(p => {
      const u = usuarios.find(x => x.id === p.id);
      return u && !isDisponible(u, formData.fecha, formData.horaInicio, formData.horaFin);
    });
  })();

  // Clear hard conflicts when key fields change
  useEffect(() => { setHardConflicts([]); },
    [formData.fecha, formData.horaInicio, formData.horaFin, formData.salaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.horaInicio >= formData.horaFin) {
      alert('La hora de fin debe ser después de la de inicio');
      return;
    }
    if (formData.tipo === 'presencial' && !formData.salaId) {
      alert('Seleccioná una sala para la reunión presencial');
      return;
    }
    setLoading(true);
    setHardConflicts([]);

    try {
      // Fetch all meetings on the same date
      const snap = await getDocs(
        query(collection(db, 'marketingar_reuniones'), where('fecha', '==', formData.fecha))
      );
      const existing = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.id !== reunion?.id);

      const overlapping = existing.filter(m =>
        m.horaInicio < formData.horaFin && m.horaFin > formData.horaInicio
      );

      const conflicts = [];

      // Hard: same sala occupied
      if (formData.tipo === 'presencial' && formData.salaId) {
        const sc = overlapping.find(m => m.salaId === formData.salaId);
        if (sc) {
          const salaName = salas.find(s => s.id === formData.salaId)?.nombre || 'la sala';
          conflicts.push(`${salaName} ya está reservada: "${sc.titulo}" (${sc.horaInicio}–${sc.horaFin})`);
        }
      }

      // Hard: participant already in another meeting
      formData.participantes.forEach(p => {
        const uc = overlapping.find(m => m.participantes?.some(mp => mp.id === p.id));
        if (uc) conflicts.push(`${p.nombre} ya tiene reunión: "${uc.titulo}" (${uc.horaInicio}–${uc.horaFin})`);
      });

      if (conflicts.length > 0) {
        setHardConflicts(conflicts);
        setLoading(false);
        return;
      }

      // Save
      const sala = salas.find(s => s.id === formData.salaId);
      const saveData = {
        titulo:        formData.titulo.trim(),
        descripcion:   formData.descripcion.trim() || null,
        tipo:          formData.tipo,
        salaId:        formData.tipo === 'presencial' ? formData.salaId    : null,
        salaNombre:    formData.tipo === 'presencial' ? (sala?.nombre || null) : null,
        fecha:         formData.fecha,
        horaInicio:    formData.horaInicio,
        horaFin:       formData.horaFin,
        participantes: formData.participantes,
        linkMeet:      formData.linkMeet.trim() || null,
        notas:         formData.notas.trim() || null,
        organizadorId: currentUser.id,
        organizadorNombre: currentUser.name,
      };

      if (isEditing) {
        await updateDoc(doc(db, 'marketingar_reuniones', reunion.id), saveData);
      } else {
        await addDoc(collection(db, 'marketingar_reuniones'), { ...saveData, createdAt: new Date() });
        // Notificar participantes (excluir organizador)
        if (saveData.participantes?.length) {
          notificarParticipantes(
            saveData.participantes.map(p => p.nombre),
            {
              tipo: 'reunion',
              titulo: saveData.titulo,
              mensaje: `${currentUser.name} te convocó a una reunión`,
              creadoPor: currentUser.name,
            }
          ).catch(() => {});
        }
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la reunión');
    }
    setLoading(false);
  };

  const toggleParticipante = (usuario) => {
    const inList = formData.participantes.some(p => p.id === usuario.id);
    setFormData(prev => ({
      ...prev,
      participantes: inList
        ? prev.participantes.filter(p => p.id !== usuario.id)
        : [...prev.participantes, { id: usuario.id, nombre: usuario.name, photoURL: usuario.photoURL || null }]
    }));
  };

  const filteredUsers = usuarios.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content reunion-modal"
        initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 24 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Reunión' : 'Nueva Reunión'}</h2>
          <div className="modal-header-btns">
            {isEditing && (
              <button
                className="btn-icon danger"
                onClick={() => { onDelete(reunion.id, reunion.titulo); onClose(); }}
                title="Eliminar reunión"
              >
                <FiTrash2 />
              </button>
            )}
            <button className="btn-icon" onClick={onClose}><FiX /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="reunion-tabs">
          <button className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>
            Información
          </button>
          <button className={tab === 'part' ? 'active' : ''} onClick={() => setTab('part')}>
            Participantes
            {formData.participantes.length > 0 && (
              <span className="tab-badge">{formData.participantes.length}</span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form reunion-form">

          {/* ── Tab: Info ── */}
          {tab === 'info' && (
            <>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  placeholder="Ej: Reunión de equipo semanal"
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <div className="tipo-toggle">
                    <button
                      type="button"
                      className={formData.tipo === 'presencial' ? 'active' : ''}
                      onClick={() => setFormData({ ...formData, tipo: 'presencial' })}
                    >
                      <FiMapPin /> Presencial
                    </button>
                    <button
                      type="button"
                      className={formData.tipo === 'virtual' ? 'active' : ''}
                      onClick={() => setFormData({ ...formData, tipo: 'virtual', salaId: '' })}
                    >
                      <FiVideo /> Virtual
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inicio *</label>
                  <input
                    type="time"
                    value={formData.horaInicio}
                    onChange={e => setFormData({ ...formData, horaInicio: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fin *</label>
                  <input
                    type="time"
                    value={formData.horaFin}
                    onChange={e => setFormData({ ...formData, horaFin: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formData.tipo === 'presencial' && (
                <div className="form-group">
                  <label>Sala *</label>
                  {salas.length === 0 ? (
                    <p className="no-salas-msg">No hay salas activas. Configurá salas en la sección Salas.</p>
                  ) : (
                    <div className="sala-picker">
                      {salas.map(sala => (
                        <button
                          key={sala.id}
                          type="button"
                          className={`sala-btn ${formData.salaId === sala.id ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, salaId: sala.id })}
                        >
                          <span className="sala-btn-dot" style={{ background: sala.color || '#462829' }} />
                          <span>{sala.nombre}</span>
                          {sala.capacidad && (
                            <span className="sala-btn-cap">{sala.capacidad}p</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label><FiLink style={{ marginRight: 5, verticalAlign: 'middle' }} />Link de videoconferencia</label>
                <input
                  type="url"
                  value={formData.linkMeet}
                  onChange={e => setFormData({ ...formData, linkMeet: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>

              <div className="form-group">
                <label>Descripción / Agenda</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  rows="3"
                  placeholder="Temas a tratar..."
                />
              </div>
            </>
          )}

          {/* ── Tab: Participantes ── */}
          {tab === 'part' && (
            <div className="part-tab">
              {/* Selected chips */}
              {formData.participantes.length > 0 && (
                <div className="selected-chips">
                  {formData.participantes.map(p => {
                    const u = usuarios.find(x => x.id === p.id);
                    const disp = !u || !formData.fecha ? true
                      : isDisponible(u, formData.fecha, formData.horaInicio, formData.horaFin);
                    return (
                      <div key={p.id} className={`part-chip ${!disp ? 'unavail' : ''}`}>
                        <div className="part-avatar">
                          {p.photoURL
                            ? <img src={p.photoURL} alt={p.nombre} />
                            : p.nombre?.charAt(0)?.toUpperCase()
                          }
                        </div>
                        <span>{p.nombre}</span>
                        {!disp && <FiAlertCircle className="unavail-icon" title="Fuera de horario disponible" />}
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => toggleParticipante({ id: p.id, name: p.nombre })}
                        >
                          <FiX />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Availability warning */}
              {warnings.length > 0 && (
                <div className="avail-warning">
                  <FiAlertTriangle />
                  <div>
                    <strong>Advertencia de disponibilidad</strong>
                    {warnings.map(p => (
                      <div key={p.id}>{p.nombre} está fuera de su horario habitual.</div>
                    ))}
                    <small>Podés guardar igualmente, pero quedará registrado.</small>
                  </div>
                </div>
              )}

              {/* Search + user list */}
              <div className="user-search-box">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Buscar usuario..."
                  autoFocus
                />
              </div>

              <div className="users-list">
                {filteredUsers.map(u => {
                  const selected = formData.participantes.some(p => p.id === u.id);
                  const disp = !formData.fecha ? true
                    : isDisponible(u, formData.fecha, formData.horaInicio, formData.horaFin);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`user-row ${selected ? 'selected' : ''} ${!disp ? 'unavail-row' : ''}`}
                      onClick={() => toggleParticipante(u)}
                    >
                      <div className="part-avatar sm">
                        {u.photoURL
                          ? <img src={u.photoURL} alt={u.name} />
                          : u.name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <div className="user-row-info">
                        <span className="user-row-name">{u.name}</span>
                        {!disp && (
                          <span className="unavail-tag">
                            <FiAlertCircle size={10} /> No disponible en ese horario
                          </span>
                        )}
                      </div>
                      {selected && <span className="user-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hard conflicts */}
          {hardConflicts.length > 0 && (
            <div className="hard-conflict-box">
              <FiAlertCircle />
              <div>
                <strong>No se puede guardar — conflicto de horario:</strong>
                {hardConflicts.map((c, i) => <div key={i} className="conflict-line">{c}</div>)}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <FiSave /> {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Reunión')}
            </button>
          </div>
        </form>

        {isEditing && reunion.organizadorNombre && (
          <div className="reunion-footer-info">
            <FiInfo size={12} />
            Organizada por <strong>{reunion.organizadorNombre}</strong>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Reuniones;
