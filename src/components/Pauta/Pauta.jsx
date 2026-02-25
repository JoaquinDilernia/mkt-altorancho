import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FiPlus, FiX, FiDollarSign, FiBarChart2, FiCalendar,
  FiLock, FiCheckCircle, FiImage, FiFileText, FiCheck,
  FiEdit2, FiTrash2
} from 'react-icons/fi';
import './Pauta.css';

const PAUTA_USERS = ['sofia', 'cami', 'vicky', 'juli', 'santiago ribatto'];
const PAUTA_TASKS_USERS = ['sofia', 'cami', 'vicky', 'juli'];
const PAUTA_STATS_USERS = ['sofia', 'cami', 'santiago ribatto'];

const CANALES = ['instagram', 'google', 'tiktok', 'metaAds', 'pinterest', 'mercadolibre'];
const CANALES_LABELS = {
  instagram: 'Instagram',
  google: 'Google',
  tiktok: 'TikTok',
  metaAds: 'Meta Ads',
  pinterest: 'Pinterest',
  mercadolibre: 'Mercado Libre',
};

const ESTADOS = {
  planificado: { label: 'Planificado', color: '#6c757d', next: 'Subir piezas (Juli)' },
  en_diseno: { label: 'Piezas cargadas', color: '#fd7e14', next: 'Cargar copies (Vicky)' },
  copy_listo: { label: 'Copy listo', color: '#0d6efd', next: 'Confirmar publicación (Cami)' },
  publicado: { label: 'Publicado', color: '#198754', next: null },
};

const Pauta = () => {
  const { userData } = useAuth();
  const username = userData?.username;
  const [mesActual, setMesActual] = useState(new Date());
  const [campanas, setCampanas] = useState([]);
  const [inversion, setInversion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [showNuevaCampana, setShowNuevaCampana] = useState(false);
  const [campanaActiva, setCampanaActiva] = useState(null);
  const [campanaEditando, setCampanaEditando] = useState(null);

  const canSeeCampanas = PAUTA_TASKS_USERS.includes(username);
  const canSeeStats = PAUTA_STATS_USERS.includes(username);
  const canCreateCampana = username === 'sofia';
  const canUploadAssets = username === 'juli';
  const canAddCopy = username === 'vicky';
  const canConfirmPublicacion = username === 'cami';
  const canSetInversion = ['santiago ribatto', 'cami'].includes(username);
  const canUpdateConsumo = ['santiago ribatto', 'cami'].includes(username);

  // Set default tab on mount
  useEffect(() => {
    if (activeTab === null) {
      if (canSeeCampanas) setActiveTab('campanas');
      else if (canSeeStats) setActiveTab('inversion');
    }
  }, [username]); // eslint-disable-line

  // Access guard
  if (!PAUTA_USERS.includes(username)) {
    return (
      <div className="pauta-no-access">
        <FiLock size={48} />
        <h2>Acceso restringido</h2>
        <p>No tenés acceso a esta sección.</p>
      </div>
    );
  }

  // Load campaigns
  useEffect(() => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);
    const q = query(
      collection(db, 'marketingar_pauta_campanas'),
      where('mes', '>=', inicio),
      where('mes', '<=', fin),
      orderBy('mes', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCampanas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [mesActual]);

  // Load inversion data
  useEffect(() => {
    const inicio = startOfMonth(mesActual);
    const fin = endOfMonth(mesActual);
    const q = query(
      collection(db, 'marketingar_pauta_inversion'),
      where('mes', '>=', inicio),
      where('mes', '<=', fin)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setInversion({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setInversion(null);
      }
    });
    return () => unsubscribe();
  }, [mesActual]);

  const handleCrearCampana = async (formData) => {
    try {
      await addDoc(collection(db, 'marketingar_pauta_campanas'), {
        mes: startOfMonth(mesActual),
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        contenido: formData.contenido,
        estado: 'planificado',
        archivos: '',
        copys: '',
        notasPublicacion: '',
        fechaCarga: new Date(),
        creadoPor: userData.name,
        historial: [{ fecha: new Date(), usuario: userData.name, accion: 'Campaña creada', estado: 'planificado' }],
      });
      setShowNuevaCampana(false);
    } catch (e) {
      console.error(e);
      alert('Error al crear campaña');
    }
  };

  const handleEliminarCampana = async (campanaId) => {
    if (!window.confirm('¿Seguro que querés eliminar esta campaña? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'marketingar_pauta_campanas', campanaId));
    } catch (e) {
      console.error(e);
      alert('Error al eliminar campaña');
    }
  };

  const handleEditarCampana = async (campanaId, formData) => {
    try {
      await updateDoc(doc(db, 'marketingar_pauta_campanas', campanaId), {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        contenido: formData.contenido,
      });
      setCampanaEditando(null);
    } catch (e) {
      console.error(e);
      alert('Error al editar campaña');
    }
  };

  const handleAvanzarEstado = async (campana, updates, nuevoEstado) => {
    const historial = [
      ...(campana.historial || []),
      { fecha: new Date(), usuario: userData.name, accion: `Avanzó a: ${ESTADOS[nuevoEstado].label}`, estado: nuevoEstado },
    ];
    try {
      await updateDoc(doc(db, 'marketingar_pauta_campanas', campana.id), {
        ...updates,
        estado: nuevoEstado,
        historial,
      });
      setCampanaActiva(null);
    } catch (e) {
      console.error(e);
      alert('Error al actualizar campaña');
    }
  };

  const handleGuardarInversion = async (formData) => {
    try {
      if (inversion) {
        await updateDoc(doc(db, 'marketingar_pauta_inversion', inversion.id), formData);
      } else {
        await addDoc(collection(db, 'marketingar_pauta_inversion'), {
          mes: startOfMonth(mesActual),
          ...formData,
          consumoPorCanal: {},
        });
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar inversión');
    }
  };

  const handleGuardarConsumo = async ({ consumo: consumoData, presupuesto: presupuestoData }) => {
    try {
      if (inversion) {
        await updateDoc(doc(db, 'marketingar_pauta_inversion', inversion.id), {
          consumoPorCanal: consumoData,
          desglosePorCanal: presupuestoData,
        });
      } else {
        // No hay doc de inversión para este mes — crear uno con el consumo
        await addDoc(collection(db, 'marketingar_pauta_inversion'), {
          mes: startOfMonth(mesActual),
          totalInversion: 0,
          objetivoFacturacion: 0,
          desglosePorCanal: presupuestoData,
          consumoPorCanal: consumoData,
        });
      }
    } catch (e) {
      console.error(e);
      alert('Error al guardar consumo');
    }
  };

  const navMes = (dir) => {
    const nuevo = new Date(mesActual);
    nuevo.setMonth(nuevo.getMonth() + dir);
    setMesActual(nuevo);
  };

  return (
    <div className="pauta-container">
      <div className="pauta-header">
        <div>
          <h1>Pauta</h1>
          <p className="subtitle">Gestión de campañas y presupuesto publicitario</p>
        </div>
        <div className="header-actions">
          <div className="mes-selector">
            <button onClick={() => navMes(-1)}>←</button>
            <span className="mes-actual">{format(mesActual, 'MMMM yyyy', { locale: es })}</span>
            <button onClick={() => navMes(1)}>→</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="pauta-tabs">
        {canSeeCampanas && (
          <button
            className={`pauta-tab ${activeTab === 'campanas' ? 'active' : ''}`}
            onClick={() => setActiveTab('campanas')}
          >
            Campañas del mes
          </button>
        )}
        {canSeeStats && (
          <button
            className={`pauta-tab ${activeTab === 'inversion' ? 'active' : ''}`}
            onClick={() => setActiveTab('inversion')}
          >
            Inversión y Objetivos
          </button>
        )}
      </div>

      {/* ── CAMPAÑAS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'campanas' && canSeeCampanas && (
        <div className="pauta-section">
          <div className="section-header">
            <h2>Campañas — {format(mesActual, 'MMMM yyyy', { locale: es })}</h2>
            {canCreateCampana && (
              <button className="btn-primary" onClick={() => setShowNuevaCampana(true)}>
                <FiPlus /> Nueva Campaña
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading">Cargando campañas...</div>
          ) : campanas.length === 0 ? (
            <div className="pauta-empty">
              <FiCalendar size={40} />
              <p>No hay campañas cargadas para este mes.</p>
              {canCreateCampana && (
                <button className="btn-primary" onClick={() => setShowNuevaCampana(true)}>
                  <FiPlus /> Crear primera campaña
                </button>
              )}
              {!canCreateCampana && (
                <p className="pauta-hint">Sofi tiene que cargar las campañas del mes.</p>
              )}
            </div>
          ) : (
            <div className="campanas-grid">
              {campanas.map((c) => {
                const estado = ESTADOS[c.estado] || ESTADOS.planificado;
                const puedeActuar =
                  (canUploadAssets && c.estado === 'planificado') ||
                  (canAddCopy && c.estado === 'en_diseno') ||
                  (canConfirmPublicacion && c.estado === 'copy_listo');

                return (
                  <motion.div
                    key={c.id}
                    className="campana-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="campana-top">
                      <span className="campana-nombre">{c.nombre}</span>
                      <div className="campana-top-right">
                        <span className="campana-estado" style={{ background: estado.color }}>
                          {estado.label}
                        </span>
                        {canCreateCampana && (
                          <div className="campana-actions">
                            <button
                              className="btn-icon-sm"
                              title="Editar campaña"
                              onClick={() => setCampanaEditando(c)}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              className="btn-icon-sm danger"
                              title="Eliminar campaña"
                              onClick={() => handleEliminarCampana(c.id)}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {c.descripcion && <p className="campana-desc">{c.descripcion}</p>}

                    <div className="campana-contenido">
                      <span className="campana-label">Contenido a subir:</span>
                      <p>{c.contenido}</p>
                    </div>

                    {/* Progress steps */}
                    <div className="campana-steps">
                      {['planificado', 'en_diseno', 'copy_listo', 'publicado'].map((s, i) => {
                        const stepList = ['planificado', 'en_diseno', 'copy_listo', 'publicado'];
                        const currentIdx = stepList.indexOf(c.estado);
                        const done = i < currentIdx;
                        const active = i === currentIdx;
                        const stepLabels = { planificado: 'Planificado', en_diseno: 'Piezas', copy_listo: 'Copy', publicado: 'Publicado' };
                        return (
                          <div key={s} className={`step ${done ? 'done' : active ? 'active' : 'pending'}`}>
                            <div className="step-dot">{done ? '✓' : i + 1}</div>
                            <span className="step-label">{stepLabels[s]}</span>
                          </div>
                        );
                      })}
                    </div>

                    {c.archivos && (
                      <div className="campana-archivos">
                        <FiImage size={13} /> <span>{c.archivos}</span>
                      </div>
                    )}
                    {c.copys && (
                      <div className="campana-copy">
                        <FiFileText size={13} /> <span>{c.copys}</span>
                      </div>
                    )}

                    {c.estado !== 'publicado' && (
                      <p className="campana-next">
                        {puedeActuar
                          ? `Tu turno: ${estado.next?.split('(')[0].trim()}`
                          : `Esperando: ${estado.next}`}
                      </p>
                    )}

                    {puedeActuar && (
                      <button className="btn-accion" onClick={() => setCampanaActiva(c)}>
                        {canUploadAssets && 'Subir piezas'}
                        {canAddCopy && 'Cargar copy'}
                        {canConfirmPublicacion && 'Confirmar publicación'}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── INVERSIÓN TAB ────────────────────────────────────────────── */}
      {activeTab === 'inversion' && canSeeStats && (
        <InversionSection
          inversion={inversion}
          mesActual={mesActual}
          canSetInversion={canSetInversion}
          canUpdateConsumo={canUpdateConsumo}
          onSaveInversion={handleGuardarInversion}
          onSaveConsumo={handleGuardarConsumo}
        />
      )}

      {/* MODALS */}
      <AnimatePresence>
        {showNuevaCampana && (
          <NuevaCampanaModal
            onClose={() => setShowNuevaCampana(false)}
            onCreate={handleCrearCampana}
            mes={mesActual}
          />
        )}
        {campanaActiva && (
          <StepModal
            campana={campanaActiva}
            username={username}
            onClose={() => setCampanaActiva(null)}
            onAvanzar={handleAvanzarEstado}
          />
        )}
        {campanaEditando && (
          <EditarCampanaModal
            campana={campanaEditando}
            onClose={() => setCampanaEditando(null)}
            onEditar={handleEditarCampana}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Inversión Section ────────────────────────────────────────────────────────
const InversionSection = ({ inversion, canSetInversion, canUpdateConsumo, onSaveInversion, onSaveConsumo }) => {
  const [editingInversion, setEditingInversion] = useState(false);
  const [editingConsumo, setEditingConsumo] = useState(false);
  const [inversionForm, setInversionForm] = useState({
    totalInversion: '',
    objetivoFacturacion: '',
    desglosePorCanal: Object.fromEntries(CANALES.map(c => [c, ''])),
  });
  const [consumoForm, setConsumoForm] = useState(
    Object.fromEntries(CANALES.map(c => [c, '']))
  );
  const [presupuestoForm, setPresupuestoForm] = useState(
    Object.fromEntries(CANALES.map(c => [c, '']))
  );

  useEffect(() => {
    if (inversion) {
      setInversionForm({
        totalInversion: inversion.totalInversion || '',
        objetivoFacturacion: inversion.objetivoFacturacion || '',
        desglosePorCanal: Object.fromEntries(
          CANALES.map(c => [c, inversion.desglosePorCanal?.[c] || ''])
        ),
      });
      setConsumoForm(
        Object.fromEntries(CANALES.map(c => [c, inversion.consumoPorCanal?.[c] || '']))
      );
      setPresupuestoForm(
        Object.fromEntries(CANALES.map(c => [c, inversion.desglosePorCanal?.[c] || '']))
      );
    }
  }, [inversion]);

  const totalDesglose = CANALES.reduce(
    (acc, c) => acc + (parseFloat(inversionForm.desglosePorCanal[c]) || 0), 0
  );

  const handleSaveInversion = async () => {
    const totalInvVal = parseFloat(inversionForm.totalInversion);
    const objetivoVal = parseFloat(inversionForm.objetivoFacturacion);
    
    // Validate that at least one field is filled
    if (isNaN(totalInvVal) && isNaN(objetivoVal)) {
      alert('Por favor, ingresá al menos el total a invertir o el objetivo de facturación');
      return;
    }
    
    // Preserve existing values if inputs are empty
    const data = {
      totalInversion: isNaN(totalInvVal) ? (inversion?.totalInversion || 0) : totalInvVal,
      objetivoFacturacion: isNaN(objetivoVal) ? (inversion?.objetivoFacturacion || 0) : objetivoVal,
      desglosePorCanal: Object.fromEntries(
        CANALES.map(c => {
          const val = parseFloat(inversionForm.desglosePorCanal[c]);
          return [c, isNaN(val) ? (inversion?.desglosePorCanal?.[c] || 0) : val];
        })
      ),
    };
    await onSaveInversion(data);
    setEditingInversion(false);
  };

  const handleSaveConsumo = async () => {
    const consumoData = Object.fromEntries(
      CANALES.map(c => [c, parseFloat(consumoForm[c]) || 0])
    );
    const presupuestoData = Object.fromEntries(
      CANALES.map(c => [c, parseFloat(presupuestoForm[c]) || 0])
    );
    await onSaveConsumo({ consumo: consumoData, presupuesto: presupuestoData });
    setEditingConsumo(false);
  };

  const totalConsumido = CANALES.reduce(
    (acc, c) => acc + (parseFloat(consumoForm[c]) || 0), 0
  );

  return (
    <div className="inversion-section">
      {/* KPIs */}
      <div className="kpi-row">
        <motion.div className="kpi-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="kpi-icon"><FiDollarSign /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total a invertir</span>
            <span className="kpi-value">${(inversion?.totalInversion || 0).toLocaleString('es-AR')}</span>
          </div>
        </motion.div>
        <motion.div className="kpi-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="kpi-icon"><FiBarChart2 /></div>
          <div className="kpi-info">
            <span className="kpi-label">Objetivo de facturación</span>
            <span className="kpi-value">${(inversion?.objetivoFacturacion || 0).toLocaleString('es-AR')}</span>
          </div>
        </motion.div>
        <motion.div className="kpi-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="kpi-icon"><FiCheckCircle /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total consumido</span>
            <span className="kpi-value">${totalConsumido.toLocaleString('es-AR')}</span>
          </div>
        </motion.div>
      </div>

      {/* Santi: set investment & billing goal */}
      {canSetInversion && (
        <div className="inversion-card">
          <div className="inversion-card-header">
            <h3>Presupuesto e inversión por canal</h3>
            {!editingInversion ? (
              <button className="btn-secondary" onClick={() => setEditingInversion(true)}>
                {inversion ? 'Editar' : 'Cargar datos'}
              </button>
            ) : (
              <div className="btn-group">
                <button className="btn-secondary" onClick={() => setEditingInversion(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveInversion}>Guardar</button>
              </div>
            )}
          </div>

          {editingInversion ? (
            <div className="inversion-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Total a invertir en pauta ($)</label>
                  <input
                    type="number"
                    value={inversionForm.totalInversion}
                    onChange={e => setInversionForm({ ...inversionForm, totalInversion: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Objetivo de facturación del mes ($)</label>
                  <input
                    type="number"
                    value={inversionForm.objetivoFacturacion}
                    onChange={e => setInversionForm({ ...inversionForm, objetivoFacturacion: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <h4>Desglose por canal</h4>
              <div className="canales-grid">
                {CANALES.map(c => (
                  <div key={c} className="form-group">
                    <label>{CANALES_LABELS[c]}</label>
                    <input
                      type="number"
                      value={inversionForm.desglosePorCanal[c]}
                      onChange={e => setInversionForm({
                        ...inversionForm,
                        desglosePorCanal: { ...inversionForm.desglosePorCanal, [c]: e.target.value },
                      })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <p className="total-desglose">
                Total desglosado: <strong>${totalDesglose.toLocaleString('es-AR')}</strong>
                {inversionForm.totalInversion &&
                  Math.abs(totalDesglose - parseFloat(inversionForm.totalInversion)) > 0.5 && (
                    <span className="diferencia">
                      {' '}— diferencia de ${Math.abs(totalDesglose - parseFloat(inversionForm.totalInversion)).toLocaleString('es-AR')}
                    </span>
                  )}
              </p>
            </div>
          ) : (
            <div className="canales-list">
              {CANALES.map(c => (
                <div key={c} className="canal-row">
                  <span className="canal-nombre">{CANALES_LABELS[c]}</span>
                  <span className="canal-monto">${(inversion?.desglosePorCanal?.[c] || 0).toLocaleString('es-AR')}</span>
                </div>
              ))}
              <div className="canal-row total-row">
                <span>Objetivo de facturación</span>
                <span>${(inversion?.objetivoFacturacion || 0).toLocaleString('es-AR')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cami: update consumption */}
      {canUpdateConsumo && (
        <div className="inversion-card">
          <div className="inversion-card-header">
            <h3>Consumo por plataforma</h3>
            {!editingConsumo ? (
              <button className="btn-secondary" onClick={() => setEditingConsumo(true)}>
                Actualizar consumos/presupuestos
              </button>
            ) : (
              <div className="btn-group">
                <button className="btn-secondary" onClick={() => setEditingConsumo(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveConsumo}>Guardar</button>
              </div>
            )}
          </div>
          <ConsumoTable
            inversion={inversion}
            consumoForm={consumoForm}
            setConsumoForm={setConsumoForm}
            presupuestoForm={presupuestoForm}
            setPresupuestoForm={setPresupuestoForm}
            editing={editingConsumo}
          />
        </div>
      )}

      {/* Sofi: read-only view */}
      {!canSetInversion && !canUpdateConsumo && (
        <div className="inversion-card">
          <div className="inversion-card-header">
            <h3>Desglose de inversión y consumo</h3>
          </div>
          <ConsumoTable inversion={inversion} editing={false} />
        </div>
      )}
    </div>
  );
};

// Shared consumption table
const ConsumoTable = ({ inversion, consumoForm, setConsumoForm, presupuestoForm, setPresupuestoForm, editing }) => (
  <div className="consumo-table">
    <div className="consumo-header-row">
      <span>Canal</span>
      <span>Presupuesto</span>
      <span>Consumido</span>
      <span>Restante</span>
    </div>
    {CANALES.map(c => {
      const presupuesto = editing && presupuestoForm
        ? (parseFloat(presupuestoForm[c]) || 0)
        : (inversion?.desglosePorCanal?.[c] || 0);
      const consumidoVal = consumoForm
        ? (parseFloat(consumoForm[c]) || 0)
        : (inversion?.consumoPorCanal?.[c] || 0);
      const restante = presupuesto - consumidoVal;
      const pct = presupuesto > 0 ? Math.min((consumidoVal / presupuesto) * 100, 100) : 0;
      return (
        <div key={c} className="consumo-row">
          <span className="consumo-canal">{CANALES_LABELS[c]}</span>
          {editing && setPresupuestoForm ? (
            <input
              type="number"
              className="consumo-input"
              value={presupuestoForm[c]}
              onChange={e => setPresupuestoForm({ ...presupuestoForm, [c]: e.target.value })}
              placeholder="0"
            />
          ) : (
            <span>${presupuesto.toLocaleString('es-AR')}</span>
          )}
          {editing && setConsumoForm ? (
            <input
              type="number"
              className="consumo-input"
              value={consumoForm[c]}
              onChange={e => setConsumoForm({ ...consumoForm, [c]: e.target.value })}
              placeholder="0"
            />
          ) : (
            <span>${consumidoVal.toLocaleString('es-AR')}</span>
          )}
          <span className={`restante ${restante < 0 ? 'negativo' : pct > 90 ? 'alerta' : ''}`}>
            ${restante.toLocaleString('es-AR')}
          </span>
          <div className="consumo-bar-wrap">
            <div
              className="consumo-bar"
              style={{
                width: `${pct}%`,
                background: pct > 90 ? '#dc3545' : pct > 70 ? '#fd7e14' : '#198754',
              }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Nueva Campaña Modal ──────────────────────────────────────────────────────
const NuevaCampanaModal = ({ onClose, onCreate, mes }) => {
  const [form, setForm] = useState({ nombre: '', descripcion: '', contenido: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre || !form.contenido) {
      alert('Completá el nombre y el contenido a subir');
      return;
    }
    onCreate(form);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Nueva Campaña — {format(mes, 'MMMM yyyy', { locale: es })}</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre de la campaña *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Campaña verano 2025"
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción / Objetivo</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="¿Qué se quiere comunicar con esta campaña?"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Contenido a subir *</label>
            <textarea
              value={form.contenido}
              onChange={e => setForm({ ...form, contenido: e.target.value })}
              placeholder="Detallá qué piezas, copys y formatos se necesitan..."
              rows={4}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Crear Campaña</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Editar Campaña Modal ─────────────────────────────────────────────────────
const EditarCampanaModal = ({ campana, onClose, onEditar }) => {
  const [form, setForm] = useState({
    nombre: campana.nombre || '',
    descripcion: campana.descripcion || '',
    contenido: campana.contenido || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre || !form.contenido) {
      alert('Completá el nombre y el contenido a subir');
      return;
    }
    onEditar(campana.id, form);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2><FiEdit2 /> Editar Campaña</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nombre de la campaña *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descripción / Objetivo</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Contenido a subir *</label>
            <textarea
              value={form.contenido}
              onChange={e => setForm({ ...form, contenido: e.target.value })}
              rows={4}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Step Modal (Juli / Vicky / Cami) ────────────────────────────────────────
const StepModal = ({ campana, username, onClose, onAvanzar }) => {
  const [texto, setTexto] = useState('');
  const isJuli = username === 'juli';
  const isVicky = username === 'vicky';
  const isCami = username === 'cami';

  const title = isJuli ? 'Subir piezas' : isVicky ? 'Cargar copy' : 'Confirmar publicación';
  const nextState = isJuli ? 'en_diseno' : isVicky ? 'copy_listo' : 'publicado';
  const field = isJuli ? 'archivos' : isVicky ? 'copys' : 'notasPublicacion';
  const placeholder = isJuli
    ? 'Pegá el link de la carpeta o describí los archivos subidos...'
    : isVicky
    ? 'Escribí el copy para esta campaña...'
    : 'Notas de publicación (opcional)...';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isCami && !texto.trim()) {
      alert('Completá el campo antes de continuar');
      return;
    }
    onAvanzar(campana, { [field]: texto }, nextState);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}: {campana.nombre}</h2>
          <button className="btn-icon" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          <div className="campana-info-box">
            {campana.descripcion && <p><strong>Descripción:</strong> {campana.descripcion}</p>}
            <p><strong>Contenido solicitado:</strong> {campana.contenido}</p>
            {campana.archivos && <p><strong>Piezas cargadas:</strong> {campana.archivos}</p>}
            {campana.copys && <p><strong>Copy:</strong> {campana.copys}</p>}
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>
                {isJuli ? 'Link / descripción de piezas' : isVicky ? 'Copy' : 'Notas de publicación'}
                {!isCami && ' *'}
              </label>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder={placeholder}
                rows={5}
                required={!isCami}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn-primary">
                <FiCheck /> {isCami ? 'Confirmar publicación' : 'Guardar y continuar'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Pauta;
