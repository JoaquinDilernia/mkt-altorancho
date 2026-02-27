import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  deleteDoc, doc, writeBatch, getDocs, addDoc, updateDoc
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { read, utils } from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FiPackage, FiUpload, FiSearch, FiX, FiTrash2,
  FiAlertTriangle, FiCheck, FiPlus, FiEdit2, FiCalendar,
  FiFile, FiExternalLink
} from 'react-icons/fi';
import './Producto.css';

const COLL_PRODUCTOS   = 'marketingar_productos';
const COLL_CALENDARIO  = 'marketingar_productos_calendario';
const COLL_COLECCIONES = 'marketingar_colecciones';

const TIPOS_CALENDARIO = ['Lanzamiento', 'Fecha clave', 'Campaña', 'Acción comercial', 'Otro'];

const TIPO_COLORS = {
  'Lanzamiento':       '#462829',
  'Fecha clave':       '#7c3aed',
  'Campaña':           '#0369a1',
  'Acción comercial':  '#065f46',
  'Otro':              '#6b7280',
};

function parseRow(row) {
  const normalize = (obj, keys) => {
    for (const k of keys) {
      for (const key of Object.keys(obj)) {
        if (key.toLowerCase().replace(/\s/g, '') === k.replace(/\s/g, '')) {
          return String(obj[key] ?? '').trim();
        }
      }
    }
    return '';
  };
  return {
    sku:         normalize(row, ['sku']),
    nombre:      normalize(row, ['nombre', 'name', 'producto']),
    precio:      normalize(row, ['precio', 'price']),
    precioPromo: normalize(row, ['preciopromo', 'preciopromocional', 'promo', 'promocional']),
    observacion: normalize(row, ['observacion', 'observaciones', 'obs', 'nota', 'notas']),
  };
}

function obsStyle(obs) {
  if (!obs) return null;
  const v = obs.toLowerCase();
  if (v.includes('discontinu'))  return { background: '#fee2e2', color: '#b91c1c' };
  if (v.includes('stock'))       return { background: '#fef3c7', color: '#92400e' };
  if (v.includes('oportunidad')) return { background: '#d1fae5', color: '#065f46' };
  return { background: '#f3f4f6', color: '#555' };
}

const Producto = () => {
  const { userData, isAdmin, isCoordinator, area } = useAuth();
  const [tab, setTab] = useState('catalogo');

  // ── Catálogo ───────────────────────────────────────────────────────────────
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroObs, setFiltroObs] = useState('todos');
  const [preview, setPreview] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  // ── Calendario ─────────────────────────────────────────────────────────────
  const [calendario, setCalendario] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ── Colecciones ────────────────────────────────────────────────────────────
  const [colecciones, setColecciones] = useState([]);
  const [loadingColecciones, setLoadingColecciones] = useState(true);
  const [showColModal, setShowColModal] = useState(false);

  const canEdit   = isAdmin || isCoordinator || area === 'producto';
  const canUpload = isAdmin || area === 'producto';

  useEffect(() => {
    const q = query(collection(db, COLL_PRODUCTOS), orderBy('nombre', 'asc'));
    return onSnapshot(q, snap => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, COLL_CALENDARIO), orderBy('fechaEvento', 'asc'));
    return onSnapshot(q, snap => {
      setCalendario(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, COLL_COLECCIONES), orderBy('fechaCarga', 'desc'));
    return onSnapshot(q, snap => {
      setColecciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingColecciones(false);
    });
  }, []);

  // ── Excel parse ────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    setUploadError('');
    setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { setUploadError('El archivo no tiene filas de datos.'); return; }
        const parsed = rows.map(parseRow).filter(r => r.nombre || r.sku);
        if (parsed.length === 0) {
          setUploadError('No se encontraron columnas válidas. Verificá que tenga SKU, NOMBRE, PRECIO, PRECIO PROMOCIONAL, OBSERVACION.');
          return;
        }
        setPreview(parsed);
      } catch {
        setUploadError('Error al leer el archivo. Verificá que sea un Excel (.xlsx / .xls).');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ── Confirmar subida catálogo ──────────────────────────────────────────────
  const handleConfirmUpload = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const existing = await getDocs(collection(db, COLL_PRODUCTOS));
      const ids = existing.docs.map(d => d.id);
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach(id => batch.delete(doc(db, COLL_PRODUCTOS, id)));
        await batch.commit();
      }
      const ts = new Date();
      for (let i = 0; i < preview.length; i += 400) {
        const batch = writeBatch(db);
        preview.slice(i, i + 400).forEach(row => {
          const ref = doc(collection(db, COLL_PRODUCTOS));
          batch.set(ref, { ...row, fechaCarga: ts, creadoPor: userData.name });
        });
        await batch.commit();
      }
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el catálogo.');
    } finally {
      setUploading(false);
    }
  };

  // ── Eliminar producto ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try { await deleteDoc(doc(db, COLL_PRODUCTOS, id)); } catch (e) { console.error(e); }
  };

  // ── Calendario CRUD ────────────────────────────────────────────────────────
  const handleSaveCalendario = async (formData) => {
    try {
      if (editingItem) {
        await updateDoc(doc(db, COLL_CALENDARIO, editingItem.id), formData);
      } else {
        await addDoc(collection(db, COLL_CALENDARIO), {
          ...formData,
          fechaCarga: new Date(),
          creadoPor: userData.name,
        });
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (e) {
      console.error(e);
      alert('Error al guardar.');
    }
  };

  const handleDeleteCalendario = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return;
    try { await deleteDoc(doc(db, COLL_CALENDARIO, id)); } catch (e) { console.error(e); }
  };

  // ── Colecciones CRUD ───────────────────────────────────────────────────────
  const handleSaveColeccion = async ({ nombre, descripcion, temporada, file }) => {
    const path = `colecciones/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(sRef, file);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', null, reject, async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, COLL_COLECCIONES), {
            nombre,
            descripcion: descripcion || '',
            temporada: temporada || '',
            url,
            storagePath: path,
            nombreArchivo: file.name,
            fechaCarga: new Date(),
            creadoPor: userData.name,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  };

  const handleDeleteColeccion = async (col) => {
    if (!confirm(`¿Eliminar "${col.nombre}"?`)) return;
    try {
      await deleteDoc(doc(db, COLL_COLECCIONES, col.id));
      if (col.storagePath) {
        await deleteObject(storageRef(storage, col.storagePath)).catch(() => {});
      }
    } catch (e) {
      console.error(e);
      alert('Error al eliminar.');
    }
  };

  // ── Filtros catálogo ───────────────────────────────────────────────────────
  const obsValues = [...new Set(productos.map(p => p.observacion).filter(Boolean))].sort();

  const filtrados = productos.filter(p => {
    const matchObs = filtroObs === 'todos' || p.observacion === filtroObs;
    const matchSearch = !search || (
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    );
    return matchObs && matchSearch;
  });

  return (
    <div className="producto-container">
      <div className="producto-header">
        <div>
          <h1>Producto</h1>
          <p className="subtitle">Portal de información de producto</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="producto-tabs">
        <button
          className={`producto-tab ${tab === 'catalogo' ? 'active' : ''}`}
          onClick={() => setTab('catalogo')}
        >
          Catálogo
        </button>
        <button
          className={`producto-tab ${tab === 'calendario' ? 'active' : ''}`}
          onClick={() => setTab('calendario')}
        >
          Calendario de producto
        </button>
        <button
          className={`producto-tab ${tab === 'colecciones' ? 'active' : ''}`}
          onClick={() => setTab('colecciones')}
        >
          Colecciones
        </button>
      </div>

      {/* ── CATÁLOGO ──────────────────────────────────────────────────────── */}
      {tab === 'catalogo' && (
        <div className="tab-section">
          <div className="section-header">
            <div>
              <h2>
                Catálogo de productos
                {!loading && <span className="catalogo-count">{productos.length} productos</span>}
              </h2>
              {!loading && productos.length > 0 && (() => {
                const raw = productos[0]?.fechaCarga;
                const d = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
                return d
                  ? <p className="catalogo-fecha">Actualizado el {format(d, "d 'de' MMMM yyyy", { locale: es })}</p>
                  : null;
              })()}
            </div>
            {canEdit && (
              <div className="header-actions-row">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileRef}
                  style={{ display: 'none' }}
                  onChange={handleFile}
                />
                <button className="btn-primary" onClick={() => fileRef.current.click()}>
                  <FiUpload size={15} /> Cargar Excel
                </button>
              </div>
            )}
          </div>

          {canEdit && productos.length === 0 && !preview && (
            <div className="excel-hint">
              <FiAlertTriangle size={14} />
              El Excel debe tener las columnas: <strong>SKU · NOMBRE · PRECIO · PRECIO PROMOCIONAL · OBSERVACION</strong>
            </div>
          )}

          {uploadError && (
            <div className="upload-error">
              <FiAlertTriangle size={14} /> {uploadError}
            </div>
          )}

          {preview && (
            <div className="preview-section">
              <div className="preview-header">
                <span><strong>{preview.length}</strong> productos listos para cargar — esto reemplazará el catálogo actual</span>
                <div className="preview-actions">
                  <button className="btn-secondary" onClick={() => setPreview(null)} disabled={uploading}>Cancelar</button>
                  <button className="btn-primary" onClick={handleConfirmUpload} disabled={uploading}>
                    {uploading ? 'Guardando...' : <><FiCheck size={14} /> Confirmar carga</>}
                  </button>
                </div>
              </div>
              <div className="catalogo-table-wrap">
                <table className="catalogo-table">
                  <thead>
                    <tr><th>SKU</th><th>Nombre</th><th>Precio</th><th>Precio promo</th><th>Observación</th></tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td className="td-sku">{r.sku}</td>
                        <td>{r.nombre}</td>
                        <td className="td-precio">{r.precio}</td>
                        <td className="td-promo">{r.precioPromo}</td>
                        <td>{r.observacion && <span className="obs-badge" style={obsStyle(r.observacion)}>{r.observacion}</span>}</td>
                      </tr>
                    ))}
                    {preview.length > 50 && (
                      <tr className="tr-more"><td colSpan={5}>... y {preview.length - 50} productos más</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!preview && productos.length > 0 && (
            <div className="catalogo-controls">
              <div className="obs-filter">
                <button
                  className={`filter-chip ${filtroObs === 'todos' ? 'active' : ''}`}
                  onClick={() => setFiltroObs('todos')}
                >
                  Todos
                </button>
                {obsValues.map(v => (
                  <button
                    key={v}
                    className={`filter-chip ${filtroObs === v ? 'active' : ''}`}
                    onClick={() => setFiltroObs(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="catalogo-search">
                <FiSearch size={15} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="clear-search" onClick={() => setSearch('')}>
                    <FiX size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {!preview && (
            loading ? (
              <div className="loading">Cargando catálogo...</div>
            ) : filtrados.length === 0 ? (
              <div className="empty-state">
                <FiPackage size={40} />
                <p>{search || filtroObs !== 'todos' ? 'Sin resultados.' : 'No hay productos. Cargá un Excel para empezar.'}</p>
              </div>
            ) : (
              <div className="catalogo-table-wrap">
                <table className="catalogo-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Nombre</th>
                      <th>Precio</th>
                      <th>Precio promo</th>
                      <th>Observación</th>
                      {canEdit && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(p => (
                      <tr key={p.id}>
                        <td className="td-sku">{p.sku}</td>
                        <td>{p.nombre}</td>
                        <td className="td-precio">{p.precio}</td>
                        <td className="td-promo">{p.precioPromo}</td>
                        <td>{p.observacion && <span className="obs-badge" style={obsStyle(p.observacion)}>{p.observacion}</span>}</td>
                        {canEdit && (
                          <td className="td-actions">
                            <button className="btn-icon-sm danger" onClick={() => handleDelete(p.id)}>
                              <FiTrash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ── CALENDARIO ────────────────────────────────────────────────────── */}
      {tab === 'calendario' && (
        <div className="tab-section">
          <div className="section-header">
            <h2>Calendario de producto</h2>
            {canEdit && (
              <button className="btn-primary" onClick={() => { setEditingItem(null); setShowModal(true); }}>
                <FiPlus size={14} /> Nuevo evento
              </button>
            )}
          </div>

          {calendario.length === 0 ? (
            <div className="empty-state">
              <FiCalendar size={40} />
              <p>No hay eventos cargados.</p>
            </div>
          ) : (
            <div className="calendario-list">
              {calendario.map(item => {
                const fecha = item.fechaEvento?.toDate
                  ? item.fechaEvento.toDate()
                  : item.fechaEvento ? new Date(item.fechaEvento) : null;
                return (
                  <div key={item.id} className="calendario-item">
                    <span
                      className="cal-tipo"
                      style={{ background: TIPO_COLORS[item.tipo] || '#6b7280' }}
                    >
                      {item.tipo}
                    </span>
                    <div className="cal-body">
                      <span className="cal-title">{item.titulo}</span>
                      {item.descripcion && <span className="cal-desc">{item.descripcion}</span>}
                      {item.notas && <span className="cal-notas">{item.notas}</span>}
                    </div>
                    <div className="cal-right">
                      {fecha && (
                        <span className="cal-fecha">
                          <FiCalendar size={12} />
                          {format(fecha, "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                      {canEdit && (
                        <div className="card-actions">
                          <button
                            className="btn-icon-sm"
                            onClick={() => { setEditingItem(item); setShowModal(true); }}
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            className="btn-icon-sm danger"
                            onClick={() => handleDeleteCalendario(item.id)}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COLECCIONES ───────────────────────────────────────────────────── */}
      {tab === 'colecciones' && (
        <div className="tab-section">
          <div className="section-header">
            <div>
              <h2>Colecciones</h2>
              <p className="catalogo-fecha">Material de colecciones en PDF</p>
            </div>
            {canUpload && (
              <button className="btn-primary" onClick={() => setShowColModal(true)}>
                <FiUpload size={14} /> Subir colección
              </button>
            )}
          </div>

          {loadingColecciones ? (
            <div className="loading">Cargando colecciones...</div>
          ) : colecciones.length === 0 ? (
            <div className="empty-state">
              <FiFile size={40} />
              <p>No hay colecciones cargadas.</p>
              {canUpload && <p style={{ fontSize: 13, color: '#bbb' }}>Usá el botón "Subir colección" para agregar un PDF.</p>}
            </div>
          ) : (
            <div className="colecciones-grid">
              {colecciones.map(col => {
                const fecha = col.fechaCarga?.toDate
                  ? col.fechaCarga.toDate()
                  : col.fechaCarga ? new Date(col.fechaCarga) : null;
                return (
                  <div key={col.id} className="coleccion-card">
                    <div className="coleccion-icon">
                      <FiFile size={28} />
                    </div>
                    <div className="coleccion-body">
                      <h3 className="coleccion-nombre">{col.nombre}</h3>
                      {col.temporada && (
                        <span className="coleccion-temporada">{col.temporada}</span>
                      )}
                      {col.descripcion && (
                        <p className="coleccion-desc">{col.descripcion}</p>
                      )}
                      <div className="coleccion-meta">
                        {fecha && (
                          <span className="coleccion-fecha">
                            {format(fecha, "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                        <span className="coleccion-autor">por {col.creadoPor}</span>
                      </div>
                    </div>
                    <div className="coleccion-actions">
                      <a
                        href={col.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ver-pdf"
                      >
                        <FiExternalLink size={14} /> Ver PDF
                      </a>
                      {canUpload && (
                        <button
                          className="btn-icon-sm danger"
                          onClick={() => handleDeleteColeccion(col)}
                          title="Eliminar"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal calendario */}
      {showModal && (
        <CalendarioModal
          editingItem={editingItem}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSave={handleSaveCalendario}
        />
      )}

      {/* Modal colecciones */}
      {showColModal && (
        <ColeccionModal
          onClose={() => setShowColModal(false)}
          onSave={handleSaveColeccion}
        />
      )}
    </div>
  );
};

// ── CalendarioModal ───────────────────────────────────────────────────────────
const CalendarioModal = ({ editingItem, onClose, onSave }) => {
  const getInitial = () => {
    if (editingItem) {
      const d = { ...editingItem };
      if (d.fechaEvento?.toDate) d.fechaEvento = d.fechaEvento.toDate().toISOString().split('T')[0];
      return d;
    }
    return { tipo: 'Lanzamiento', titulo: '', descripcion: '', notas: '', fechaEvento: '' };
  };

  const [form, setForm] = useState(getInitial());
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (data.fechaEvento) data.fechaEvento = new Date(data.fechaEvento);
    await onSave(data);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingItem ? 'Editar evento' : 'Nuevo evento'}</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Tipo *</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS_CALENDARIO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.fechaEvento || ''} onChange={e => set('fechaEvento', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Título *</label>
            <input
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              required
              placeholder="Ej: Lanzamiento colección verano"
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Detalle del evento..."
            />
          </div>
          <div className="form-group">
            <label>Notas</label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              rows={2}
              placeholder="Observaciones adicionales..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── ColeccionModal ────────────────────────────────────────────────────────────
const ColeccionModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ nombre: '', descripcion: '', temporada: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const pdfRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF.');
      e.target.value = '';
      return;
    }
    setError('');
    setPdfFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) { setError('Seleccioná un archivo PDF.'); return; }
    setSaving(true);
    setProgress(0);
    try {
      await onSave({ ...form, file: pdfFile });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al subir el archivo. Intentá de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Subir colección</h2>
          <button className="btn-icon" onClick={onClose} disabled={saving}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              required
              placeholder="Ej: Colección Primavera 2025"
            />
          </div>
          <div className="form-group">
            <label>Temporada</label>
            <input
              value={form.temporada}
              onChange={e => set('temporada', e.target.value)}
              placeholder="Ej: Verano 2025, SS26..."
            />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={2}
              placeholder="Detalle opcional..."
            />
          </div>
          <div className="form-group">
            <label>Archivo PDF *</label>
            <input
              type="file"
              accept=".pdf"
              ref={pdfRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div
              className={`pdf-dropzone ${pdfFile ? 'has-file' : ''}`}
              onClick={() => pdfRef.current.click()}
            >
              <FiFile size={20} />
              {pdfFile ? (
                <span className="pdf-filename">{pdfFile.name}</span>
              ) : (
                <span>Hacer clic para seleccionar un PDF</span>
              )}
            </div>
          </div>
          {error && (
            <div className="upload-error">
              <FiAlertTriangle size={14} /> {error}
            </div>
          )}
          {saving && (
            <div className="upload-progress">
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span>Subiendo archivo...</span>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Subiendo...' : <><FiUpload size={14} /> Subir</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Producto;
