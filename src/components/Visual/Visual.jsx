import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, arrayUnion
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FiPlus, FiX, FiEdit2, FiTrash2, FiMapPin, FiCamera,
  FiMessageSquare, FiSend, FiCheck, FiChevronDown,
  FiChevronUp, FiImage, FiLayout, FiCalendar
} from 'react-icons/fi';
import './Visual.css';

const LOCALES = ['Nordelta', 'Lomas', 'Belgrano'];

const Visual = () => {
  const { userData, roleType, area, isLocales } = useAuth();
  const [tab, setTab] = useState('seguimiento');
  const [visitas, setVisitas] = useState([]);
  const [armados, setArmados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('visita');
  const [filtroLocal, setFiltroLocal] = useState('todos');

  const canEdit = roleType === 'superadmin' || roleType === 'coordinador' || roleType === 'visual';

  // ── Visitas ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'marketingar_visual_visitas'), orderBy('fechaVisita', 'desc'));
    return onSnapshot(q, snap => {
      setVisitas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  // ── Armados ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'marketingar_visual_armados'), orderBy('fechaCarga', 'desc'));
    return onSnapshot(q, snap => {
      setArmados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const openCreate = (type) => {
    setEditingItem(null);
    setModalType(type);
    setShowModal(true);
  };

  const openEdit = (item, type) => {
    setEditingItem(item);
    setModalType(type);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    const coll = modalType === 'visita'
      ? 'marketingar_visual_visitas'
      : 'marketingar_visual_armados';
    try {
      if (editingItem) {
        await updateDoc(doc(db, coll, editingItem.id), formData);
      } else {
        await addDoc(collection(db, coll), {
          ...formData,
          fechaCarga: new Date(),
          creadoPor: userData.name,
          comentarios: [],
          confirmaciones: [],
        });
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Error al guardar');
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('¿Eliminar este elemento?')) return;
    const coll = type === 'visita'
      ? 'marketingar_visual_visitas'
      : 'marketingar_visual_armados';
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmar = async (collName, itemId, confirmaciones) => {
    const yaConfirmo = (confirmaciones || []).some(c => c.username === userData.username);
    if (yaConfirmo) return; // ya confirmó, no duplicar
    const conf = {
      username: userData.username,
      nombre: userData.name,
      fecha: new Date().toISOString(),
    };
    try {
      await updateDoc(doc(db, collName, itemId), {
        confirmaciones: arrayUnion(conf),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (collName, itemId, texto) => {
    if (!texto.trim()) return;
    const comment = {
      texto: texto.trim(),
      creadoPor: userData.name,
      username: userData.username,
      fecha: new Date().toISOString(),
    };
    try {
      await updateDoc(doc(db, collName, itemId), {
        comentarios: arrayUnion(comment),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Locales disponibles con visitas
  const localesConVisitas = ['todos', ...new Set(visitas.map(v => v.local).filter(Boolean))];
  const visitasFiltradas = filtroLocal === 'todos'
    ? visitas
    : visitas.filter(v => v.local === filtroLocal);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="visual-container">
      <div className="visual-header">
        <div>
          <h1>Visual</h1>
          <p className="subtitle">Seguimiento de locales y armados visuales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="visual-tabs">
        <button
          className={`visual-tab ${tab === 'seguimiento' ? 'active' : ''}`}
          onClick={() => setTab('seguimiento')}
        >
          Seguimiento por local
        </button>
        <button
          className={`visual-tab ${tab === 'armados' ? 'active' : ''}`}
          onClick={() => setTab('armados')}
        >
          Armados generales
        </button>
      </div>

      {/* ── Seguimiento por local ──────────────────────────────────────── */}
      {tab === 'seguimiento' && (
        <div className="tab-section">
          <div className="section-header">
            <div className="header-left">
              <h2>Visitas a locales</h2>
              {/* Filtro por local */}
              <div className="locales-filter">
                {localesConVisitas.map(l => (
                  <button
                    key={l}
                    className={`filter-chip ${filtroLocal === l ? 'active' : ''}`}
                    onClick={() => setFiltroLocal(l)}
                  >
                    {l === 'todos' ? 'Todos' : l}
                  </button>
                ))}
              </div>
            </div>
            {canEdit && (
              <button className="btn-primary" onClick={() => openCreate('visita')}>
                <FiPlus /> Nueva visita
              </button>
            )}
          </div>

          {visitasFiltradas.length === 0 ? (
            <EmptyState icon={<FiMapPin size={40} />} text="Sin visitas registradas." />
          ) : (
            <div className="visitas-grid">
              {visitasFiltradas.map(v => (
                <VisitaCard
                  key={v.id}
                  item={v}
                  canEdit={canEdit}
                  userData={userData}
                  onEdit={() => openEdit(v, 'visita')}
                  onDelete={() => handleDelete(v.id, 'visita')}
                  onConfirmar={() => handleConfirmar('marketingar_visual_visitas', v.id, v.confirmaciones)}
                  onComment={(txt) => handleAddComment('marketingar_visual_visitas', v.id, txt)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Armados generales ─────────────────────────────────────────── */}
      {tab === 'armados' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>Bajadas visuales generales</h2>
            {canEdit && (
              <button className="btn-primary" onClick={() => openCreate('armado')}>
                <FiPlus /> Nuevo armado
              </button>
            )}
          </div>

          {armados.length === 0 ? (
            <EmptyState icon={<FiLayout size={40} />} text="Sin armados cargados." />
          ) : (
            <div className="armados-grid">
              {armados.map(a => (
                <ArmadoCard
                  key={a.id}
                  item={a}
                  canEdit={canEdit}
                  userData={userData}
                  onEdit={() => openEdit(a, 'armado')}
                  onDelete={() => handleDelete(a.id, 'armado')}
                  onConfirmar={() => handleConfirmar('marketingar_visual_armados', a.id, a.confirmaciones)}
                  onComment={(txt) => handleAddComment('marketingar_visual_armados', a.id, txt)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <VisualModal
            type={modalType}
            editingItem={editingItem}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── VisitaCard ────────────────────────────────────────────────────────────────
const VisitaCard = ({ item, canEdit, userData, onEdit, onDelete, onConfirmar, onComment }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const yaConfirmo = (item.confirmaciones || []).some(c => c.username === userData.username);

  const fecha = item.fechaVisita?.toDate
    ? item.fechaVisita.toDate()
    : item.fechaVisita ? new Date(item.fechaVisita) : null;

  const submitComment = () => {
    onComment(commentText);
    setCommentText('');
  };

  return (
    <motion.div
      className="visita-card"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="visita-top">
        <div className="visita-local">
          <FiMapPin size={14} />
          {item.local}
        </div>
        <div className="card-actions">
          {canEdit && (
            <>
              <button className="btn-icon-sm" onClick={onEdit}><FiEdit2 size={14} /></button>
              <button className="btn-icon-sm danger" onClick={onDelete}><FiTrash2 size={14} /></button>
            </>
          )}
        </div>
      </div>

      {fecha && (
        <div className="visita-fecha">
          <FiCalendar size={12} />
          {format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </div>
      )}

      {item.notas && (
        <div className="visita-notas">
          <span className="field-label">Notas</span>
          <p>{item.notas}</p>
        </div>
      )}

      {item.aclaraciones && (
        <div className="visita-notas">
          <span className="field-label">Aclaraciones</span>
          <p>{item.aclaraciones}</p>
        </div>
      )}

      {item.fotos && (
        <div className="visita-fotos">
          <FiImage size={13} />
          <a href={item.fotos} target="_blank" rel="noreferrer">Ver fotos</a>
        </div>
      )}

      {/* Confirmaciones */}
      <div className="confirmaciones-row">
        <button
          className={`btn-confirmar ${yaConfirmo ? 'confirmado' : ''}`}
          onClick={onConfirmar}
          disabled={yaConfirmo}
        >
          <FiCheck size={13} />
          {yaConfirmo ? 'Implementación confirmada' : 'Confirmar implementación'}
        </button>
        {(item.confirmaciones || []).length > 0 && (
          <span className="confirmaciones-count">
            {item.confirmaciones.length} confirmación{item.confirmaciones.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Comments */}
      <button className="btn-comments-toggle" onClick={() => setShowComments(!showComments)}>
        <FiMessageSquare size={13} />
        {(item.comentarios || []).length} comentarios
        {showComments ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
      </button>

      {showComments && (
        <div className="comments-section">
          {(item.comentarios || []).map((c, i) => (
            <div key={i} className="comment">
              <span className="comment-author">{c.creadoPor}</span>
              <span className="comment-text">{c.texto}</span>
            </div>
          ))}
          <div className="comment-input-row">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Comentario o devolución..."
              onKeyDown={e => e.key === 'Enter' && submitComment()}
            />
            <button className="btn-icon-sm" onClick={submitComment}><FiSend size={13} /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── ArmadoCard ────────────────────────────────────────────────────────────────
const ArmadoCard = ({ item, canEdit, userData, onEdit, onDelete, onConfirmar, onComment }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const yaConfirmo = (item.confirmaciones || []).some(c => c.username === userData.username);

  const submitComment = () => {
    onComment(commentText);
    setCommentText('');
  };

  return (
    <motion.div
      className="armado-card"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    >
      <div className="armado-top">
        <h3 className="armado-title">{item.titulo}</h3>
        {canEdit && (
          <div className="card-actions">
            <button className="btn-icon-sm" onClick={onEdit}><FiEdit2 size={14} /></button>
            <button className="btn-icon-sm danger" onClick={onDelete}><FiTrash2 size={14} /></button>
          </div>
        )}
      </div>

      {item.descripcion && <p className="armado-desc">{item.descripcion}</p>}

      {item.indicaciones && (
        <div className="armado-section">
          <span className="field-label">Indicaciones de exhibición</span>
          <p>{item.indicaciones}</p>
        </div>
      )}

      {item.criterios && (
        <div className="armado-section">
          <span className="field-label">Criterios</span>
          <p>{item.criterios}</p>
        </div>
      )}

      {item.fotos && (
        <div className="visita-fotos">
          <FiImage size={13} />
          <a href={item.fotos} target="_blank" rel="noreferrer">Ver referencias / fotos</a>
        </div>
      )}

      <div className="confirmaciones-row">
        <button
          className={`btn-confirmar ${yaConfirmo ? 'confirmado' : ''}`}
          onClick={onConfirmar}
          disabled={yaConfirmo}
        >
          <FiCheck size={13} />
          {yaConfirmo ? 'Bajada confirmada' : 'Confirmar bajada'}
        </button>
        {(item.confirmaciones || []).length > 0 && (
          <span className="confirmaciones-count">
            {item.confirmaciones.length} confirmación{item.confirmaciones.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <button className="btn-comments-toggle" onClick={() => setShowComments(!showComments)}>
        <FiMessageSquare size={13} />
        {(item.comentarios || []).length} comentarios
        {showComments ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
      </button>

      {showComments && (
        <div className="comments-section">
          {(item.comentarios || []).map((c, i) => (
            <div key={i} className="comment">
              <span className="comment-author">{c.creadoPor}</span>
              <span className="comment-text">{c.texto}</span>
            </div>
          ))}
          <div className="comment-input-row">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Devolución operativa o faltante..."
              onKeyDown={e => e.key === 'Enter' && submitComment()}
            />
            <button className="btn-icon-sm" onClick={submitComment}><FiSend size={13} /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ── VisualModal ───────────────────────────────────────────────────────────────
const VisualModal = ({ type, editingItem, onClose, onSave }) => {
  const getInitial = () => {
    if (editingItem) {
      const d = { ...editingItem };
      if (d.fechaVisita?.toDate) d.fechaVisita = d.fechaVisita.toDate().toISOString().split('T')[0];
      return d;
    }
    if (type === 'visita') return { local: 'Nordelta', fechaVisita: '', notas: '', aclaraciones: '', fotos: '' };
    return { titulo: '', descripcion: '', indicaciones: '', criterios: '', fotos: '' };
  };

  const [form, setForm] = useState(getInitial());
  const [fotoFile, setFotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const data = { ...form };
      if (type === 'visita' && data.fechaVisita) {
        data.fechaVisita = new Date(data.fechaVisita);
      }
      // Si hay archivo nuevo, subirlo a Storage
      if (fotoFile) {
        const path = `visual/${Date.now()}_${fotoFile.name}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, fotoFile);
        data.fotos = await getDownloadURL(sRef);
      }
      onSave(data);
    } catch (err) {
      console.error(err);
      alert('Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal-content" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingItem ? 'Editar' : 'Nueva'} {type === 'visita' ? 'visita' : 'bajada visual'}</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {type === 'visita' ? (
            <>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Local *</label>
                  <select value={form.local} onChange={e => set('local', e.target.value)}>
                    {LOCALES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de visita</label>
                  <input type="date" value={form.fechaVisita || ''} onChange={e => set('fechaVisita', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3} placeholder="Qué se trabajó, estado del local..." />
              </div>
              <div className="form-group">
                <label>Aclaraciones</label>
                <textarea value={form.aclaraciones} onChange={e => set('aclaraciones', e.target.value)} rows={3} placeholder="Pendientes, observaciones..." />
              </div>
              <FotoUploadField
                fotoUrl={form.fotos}
                fotoFile={fotoFile}
                fileRef={fileRef}
                onFileChange={setFotoFile}
              />
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Título *</label>
                <input value={form.titulo} onChange={e => set('titulo', e.target.value)} required placeholder="Ej: Armado Sale Amore di Summer" />
              </div>
              <div className="form-group">
                <label>Descripción general</label>
                <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} placeholder="Bajada general del armado..." />
              </div>
              <div className="form-group">
                <label>Indicaciones de exhibición</label>
                <textarea value={form.indicaciones} onChange={e => set('indicaciones', e.target.value)} rows={3} placeholder="Cómo exhibir, posición, criterios de orden..." />
              </div>
              <div className="form-group">
                <label>Criterios y aclaraciones</label>
                <textarea value={form.criterios} onChange={e => set('criterios', e.target.value)} rows={3} placeholder="Aclaraciones adicionales..." />
              </div>
              <FotoUploadField
                fotoUrl={form.fotos}
                fotoFile={fotoFile}
                fileRef={fileRef}
                onFileChange={setFotoFile}
              />
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Subiendo...' : editingItem ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Campo de foto con upload ───────────────────────────────────────────────────
const FotoUploadField = ({ fotoUrl, fotoFile, fileRef, onFileChange }) => (
  <div className="form-group">
    <label>Fotos</label>
    <input
      type="file"
      accept="image/*,.pdf"
      ref={fileRef}
      style={{ display: 'none' }}
      onChange={e => onFileChange(e.target.files?.[0] || null)}
    />
    <div className="foto-upload-row">
      <button type="button" className="btn-secondary" onClick={() => fileRef.current.click()}>
        <FiCamera size={14} /> Subir imagen
      </button>
      {fotoFile ? (
        <span className="foto-filename">{fotoFile.name}</span>
      ) : fotoUrl ? (
        <a href={fotoUrl} target="_blank" rel="noreferrer" className="foto-link">
          <FiImage size={13} /> Ver foto actual
        </a>
      ) : (
        <span className="foto-empty">Sin foto</span>
      )}
    </div>
  </div>
);

// ── EmptyState ────────────────────────────────────────────────────────────────
const EmptyState = ({ icon, text }) => (
  <div className="empty-state">
    {icon}
    <p>{text}</p>
  </div>
);

export default Visual;
