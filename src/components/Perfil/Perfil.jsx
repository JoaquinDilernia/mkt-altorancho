import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import {
  FiUser, FiLock, FiCamera, FiSave,
  FiPlus, FiX, FiCalendar, FiMail
} from 'react-icons/fi';
import { ROLE_LABELS, AREA_LABELS } from '../../utils/roles';
import './Perfil.css';

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIA_LABELS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
};
const DEFAULT_DISPONIBILIDAD = {
  lunes:     { activo: true,  inicio: '09:00', fin: '18:00' },
  martes:    { activo: true,  inicio: '09:00', fin: '18:00' },
  miercoles: { activo: true,  inicio: '09:00', fin: '18:00' },
  jueves:    { activo: true,  inicio: '09:00', fin: '18:00' },
  viernes:   { activo: true,  inicio: '09:00', fin: '18:00' },
  sabado:    { activo: false, inicio: '09:00', fin: '18:00' },
  domingo:   { activo: false, inicio: '09:00', fin: '18:00' },
};

const Perfil = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('datos');

  // ── Datos personales ──────────────────────────────────────────────────────
  const [nombre, setNombre] = useState(userData.name || '');
  const [email, setEmail] = useState(userData.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(userData.photoURL || null);
  const [savingDatos, setSavingDatos] = useState(false);
  const [msgDatos, setMsgDatos] = useState({ text: '', ok: true });

  // ── Disponibilidad ────────────────────────────────────────────────────────
  const [disponibilidad, setDisponibilidad] = useState(
    userData.disponibilidadSemanal || DEFAULT_DISPONIBILIDAD
  );
  const [excepciones, setExcepciones] = useState(userData.excepciones || []);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaDisponible, setNuevaDisponible] = useState(false);
  const [nuevoMotivo, setNuevoMotivo] = useState('');
  const [savingDisp, setSavingDisp] = useState(false);
  const [msgDisp, setMsgDisp] = useState({ text: '', ok: true });

  const showMsg = (setter, text, ok = true) => {
    setter({ text, ok });
    setTimeout(() => setter({ text: '', ok: true }), 3000);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveDatos = async (e) => {
    e.preventDefault();
    if (password && password !== passwordConfirm) {
      showMsg(setMsgDatos, 'Las contraseñas no coinciden', false);
      return;
    }
    setSavingDatos(true);
    try {
      const updates = { name: nombre.trim(), email: email.trim() };
      if (photoFile) {
        const storageRef = ref(storage, `profile-photos/${userData.id}`);
        await uploadBytes(storageRef, photoFile);
        updates.photoURL = await getDownloadURL(storageRef);
      }
      if (password.trim()) {
        updates.password = password.trim();
      }
      await updateDoc(doc(db, 'marketingar_users', userData.id), updates);
      setPassword('');
      setPasswordConfirm('');
      setPhotoFile(null);
      showMsg(setMsgDatos, 'Cambios guardados');
    } catch (err) {
      console.error(err);
      showMsg(setMsgDatos, 'Error al guardar', false);
    }
    setSavingDatos(false);
  };

  const toggleDia = (dia) => {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia].activo }
    }));
  };

  const updateSlot = (dia, field, value) => {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value }
    }));
  };

  const addExcepcion = () => {
    if (!nuevaFecha) return;
    if (excepciones.find(e => e.fecha === nuevaFecha)) return;
    setExcepciones(prev =>
      [...prev, { fecha: nuevaFecha, disponible: nuevaDisponible, motivo: nuevoMotivo.trim() || null }]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    );
    setNuevaFecha('');
    setNuevoMotivo('');
    setNuevaDisponible(false);
  };

  const removeExcepcion = (fecha) => {
    setExcepciones(prev => prev.filter(e => e.fecha !== fecha));
  };

  const handleSaveDisponibilidad = async () => {
    setSavingDisp(true);
    try {
      await updateDoc(doc(db, 'marketingar_users', userData.id), {
        disponibilidadSemanal: disponibilidad,
        excepciones
      });
      showMsg(setMsgDisp, 'Disponibilidad guardada');
    } catch (err) {
      console.error(err);
      showMsg(setMsgDisp, 'Error al guardar', false);
    }
    setSavingDisp(false);
  };

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>Mi Perfil</h1>
        <p className="subtitle">Gestioná tu información personal y disponibilidad para reuniones</p>
      </div>

      <div className="perfil-tabs">
        <button
          className={activeTab === 'datos' ? 'active' : ''}
          onClick={() => setActiveTab('datos')}
        >
          <FiUser /> Mis datos
        </button>
        <button
          className={activeTab === 'disponibilidad' ? 'active' : ''}
          onClick={() => setActiveTab('disponibilidad')}
        >
          <FiCalendar /> Mi disponibilidad
        </button>
      </div>

      {activeTab === 'datos' && (
        <motion.div
          key="datos"
          className="perfil-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Avatar */}
          <div className="perfil-avatar-section">
            <div className="perfil-avatar-wrapper">
              {photoPreview ? (
                <img src={photoPreview} alt="foto de perfil" className="perfil-avatar-img" />
              ) : (
                <div className="perfil-avatar-placeholder">
                  {userData.name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <label className="perfil-avatar-upload" title="Cambiar foto">
                <FiCamera />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div className="perfil-avatar-info">
              <div className="perfil-username">@{userData.username}</div>
              <div className="perfil-role-badges">
                <span className="badge role-badge">
                  {ROLE_LABELS[userData.roleType] || userData.roleType}
                </span>
                {userData.area && (
                  <span className="badge area-badge">
                    {AREA_LABELS[userData.area] || userData.area}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveDatos} className="perfil-form">
            <div className="form-group">
              <label>Nombre visible</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="form-group">
              <label><FiMail style={{ verticalAlign: 'middle', marginRight: 4 }} />Email para notificaciones</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com (opcional)"
              />
            </div>

            <div className="form-group">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
                autoComplete="new-password"
              />
            </div>

            {password && (
              <div className="form-group">
                <label>Confirmar contraseña</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repetí la nueva contraseña"
                  autoComplete="new-password"
                />
              </div>
            )}

            <div className="perfil-actions">
              {msgDatos.text && (
                <span className={`perfil-msg ${msgDatos.ok ? 'success' : 'error'}`}>
                  {msgDatos.text}
                </span>
              )}
              <motion.button
                type="submit"
                className="btn-primary"
                disabled={savingDatos}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiSave /> {savingDatos ? 'Guardando...' : 'Guardar cambios'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {activeTab === 'disponibilidad' && (
        <motion.div
          key="disponibilidad"
          className="perfil-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="section-title">Horario semanal recurrente</h3>
          <p className="section-desc">
            Indicá en qué días y horarios estás disponible habitualmente para reuniones.
          </p>

          <div className="disponibilidad-grid">
            {DIAS.map(dia => {
              const slot = disponibilidad[dia] || { activo: false, inicio: '09:00', fin: '18:00' };
              return (
                <div key={dia} className={`disponibilidad-row ${!slot.activo ? 'inactivo' : ''}`}>
                  <label className="disp-toggle">
                    <input
                      type="checkbox"
                      checked={slot.activo}
                      onChange={() => toggleDia(dia)}
                    />
                    <span className="disp-dia">{DIA_LABELS[dia]}</span>
                  </label>

                  {slot.activo ? (
                    <div className="disp-horario">
                      <input
                        type="time"
                        value={slot.inicio}
                        onChange={(e) => updateSlot(dia, 'inicio', e.target.value)}
                      />
                      <span className="disp-a">a</span>
                      <input
                        type="time"
                        value={slot.fin}
                        onChange={(e) => updateSlot(dia, 'fin', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="disp-no-disponible">No disponible</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Excepciones */}
          <div className="excepciones-section">
            <h3 className="section-title">Excepciones por fecha</h3>
            <p className="section-desc">
              Fechas puntuales donde tu disponibilidad difiere de lo habitual (se mostrará en reuniones).
            </p>

            <div className="excepcion-add">
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
              />
              <select
                value={nuevaDisponible ? 'disponible' : 'no_disponible'}
                onChange={(e) => setNuevaDisponible(e.target.value === 'disponible')}
                className="excepcion-select"
              >
                <option value="no_disponible">No disponible ese día</option>
                <option value="disponible">Disponible ese día (override)</option>
              </select>
              <input
                type="text"
                value={nuevoMotivo}
                onChange={(e) => setNuevoMotivo(e.target.value)}
                placeholder="Motivo (opcional)"
                className="excepcion-motivo"
              />
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={addExcepcion}
                disabled={!nuevaFecha}
              >
                <FiPlus /> Agregar
              </button>
            </div>

            {excepciones.length > 0 && (
              <div className="excepciones-list">
                {excepciones.map(exc => (
                  <div
                    key={exc.fecha}
                    className={`excepcion-item ${exc.disponible ? 'disponible' : 'no-disponible'}`}
                  >
                    <FiCalendar />
                    <span className="exc-fecha">
                      {exc.fecha.split('-').reverse().join('/')}
                    </span>
                    <span className="exc-estado">
                      {exc.disponible ? 'Disponible' : 'No disponible'}
                    </span>
                    {exc.motivo && (
                      <span className="exc-motivo">— {exc.motivo}</span>
                    )}
                    <button
                      className="btn-icon btn-xs"
                      onClick={() => removeExcepcion(exc.fecha)}
                      title="Eliminar excepción"
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {excepciones.length === 0 && (
              <p className="excepciones-empty">No hay excepciones configuradas</p>
            )}
          </div>

          <div className="perfil-actions">
            {msgDisp.text && (
              <span className={`perfil-msg ${msgDisp.ok ? 'success' : 'error'}`}>
                {msgDisp.text}
              </span>
            )}
            <motion.button
              type="button"
              className="btn-primary"
              onClick={handleSaveDisponibilidad}
              disabled={savingDisp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiSave /> {savingDisp ? 'Guardando...' : 'Guardar disponibilidad'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Perfil;
