import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion } from 'framer-motion';
import { 
  FiTrendingUp, 
  FiCheckCircle, 
  FiClock,
  FiAlertTriangle,
  FiUsers,
  FiCalendar,
  FiInstagram,
  FiBarChart2
} from 'react-icons/fi';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import './Metricas.css';

const Metricas = () => {
  const [tareas, setTareas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [contenidosRedes, setContenidosRedes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes_actual');

  useEffect(() => {
    const unsubTareas = onSnapshot(collection(db, 'marketingar_tareas'), (snapshot) => {
      setTareas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsuarios = onSnapshot(
      query(collection(db, 'marketingar_users'), where('active', '==', true)),
      (snapshot) => {
        setUsuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubRedes = onSnapshot(collection(db, 'marketingar_redes'), (snapshot) => {
      setContenidosRedes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEventos = onSnapshot(collection(db, 'marketingar_calendario'), (snapshot) => {
      setEventos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubTareas();
      unsubUsuarios();
      unsubRedes();
      unsubEventos();
    };
  }, []);

  // Métricas generales
  const tareasFinalizadas = tareas.filter(t => t.estado === 'finalizado').length;
  const tareasEnProceso = tareas.filter(t => t.estado === 'proceso').length;
  const tareasTrabadas = tareas.filter(t => t.estado === 'trabada').length;
  const tareasVencidas = tareas.filter(t => {
    if (!t.fechaEntrega || t.estado === 'finalizado') return false;
    const entrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega);
    return entrega < new Date();
  }).length;

  const contenidosPublicados = contenidosRedes.filter(c =>
    c.publicado || (c.publicaciones && Object.values(c.publicaciones).some(p => p?.publicado))
  ).length;
  const contenidosPendientes = contenidosRedes.filter(c =>
    !c.publicado && (!c.publicaciones || !Object.values(c.publicaciones).some(p => p?.publicado))
  ).length;

  // Métricas por usuario
  const metricasPorUsuario = usuarios.filter(u => u.role !== 'admin').map(usuario => {
    const tareasUsuario = tareas.filter(t => t.asignadoId === usuario.id);
    const finalizadas = tareasUsuario.filter(t => t.estado === 'finalizado').length;
    const pendientes = tareasUsuario.filter(t => t.estado !== 'finalizado').length;
    const vencidas = tareasUsuario.filter(t => {
      if (!t.fechaEntrega || t.estado === 'finalizado') return false;
      const entrega = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega);
      return entrega < new Date();
    }).length;

    return {
      ...usuario,
      totalTareas: tareasUsuario.length,
      finalizadas,
      pendientes,
      vencidas,
      tasaCompletado: tareasUsuario.length > 0 ? Math.round((finalizadas / tareasUsuario.length) * 100) : 0
    };
  });

  const statsCards = [
    {
      title: 'Total Tareas',
      value: tareas.length,
      icon: FiCheckCircle,
      color: '#3b82f6',
      subtitle: `${tareasFinalizadas} finalizadas`
    },
    {
      title: 'En Proceso',
      value: tareasEnProceso,
      icon: FiClock,
      color: '#f59e0b',
      subtitle: `${tareasTrabadas} trabadas`
    },
    {
      title: 'Vencidas',
      value: tareasVencidas,
      icon: FiAlertTriangle,
      color: '#ef4444',
      subtitle: 'Requieren atención'
    },
    {
      title: 'Contenidos',
      value: contenidosRedes.length,
      icon: FiInstagram,
      color: '#8b5cf6',
      subtitle: `${contenidosPublicados} publicados`
    },
    {
      title: 'Eventos',
      value: eventos.length,
      icon: FiCalendar,
      color: '#10b981',
      subtitle: 'Este mes'
    },
    {
      title: 'Equipo Activo',
      value: usuarios.filter(u => u.role !== 'admin').length,
      icon: FiUsers,
      color: '#06b6d4',
      subtitle: `${usuarios.length} total`
    }
  ];

  if (loading) {
    return <div className="loading">Cargando métricas...</div>;
  }

  return (
    <div className="metricas-container">
      <div className="metricas-header">
        <div>
          <h1>Métricas y Reportes</h1>
          <p className="subtitle">Análisis de desempeño del equipo</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-overview">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              className="stat-card-large"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="stat-icon-large" style={{ background: stat.color }}>
                <Icon />
              </div>
              <div className="stat-content">
                <div className="stat-value-large">{stat.value}</div>
                <div className="stat-title">{stat.title}</div>
                <div className="stat-subtitle">{stat.subtitle}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desempeño por Usuario */}
      <div className="section-card">
        <div className="section-header">
          <h2>
            <FiBarChart2 /> Desempeño por Usuario
          </h2>
        </div>

        <div className="usuarios-metricas">
          {metricasPorUsuario.map(usuario => (
            <motion.div
              key={usuario.id}
              className="usuario-metrica-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="usuario-info">
                <div className="usuario-avatar" style={{ background: `linear-gradient(135deg, #462829, #353434)` }}>
                  {usuario.name.charAt(0)}
                </div>
                <div>
                  <div className="usuario-nombre">{usuario.name}</div>
                  <div className="usuario-area">{usuario.areas?.[0]}</div>
                </div>
              </div>

              <div className="metricas-grid">
                <div className="metrica-item">
                  <div className="metrica-valor">{usuario.totalTareas}</div>
                  <div className="metrica-label">Total</div>
                </div>
                <div className="metrica-item success">
                  <div className="metrica-valor">{usuario.finalizadas}</div>
                  <div className="metrica-label">Finalizadas</div>
                </div>
                <div className="metrica-item warning">
                  <div className="metrica-valor">{usuario.pendientes}</div>
                  <div className="metrica-label">Pendientes</div>
                </div>
                <div className="metrica-item danger">
                  <div className="metrica-valor">{usuario.vencidas}</div>
                  <div className="metrica-label">Vencidas</div>
                </div>
              </div>

              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${usuario.tasaCompletado}%`,
                    background: usuario.tasaCompletado > 70 ? '#10b981' : usuario.tasaCompletado > 40 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
              <div className="tasa-completado">
                Tasa de completado: <strong>{usuario.tasaCompletado}%</strong>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Resumen de Contenidos */}
      <div className="section-card">
        <div className="section-header">
          <h2>
            <FiInstagram /> Contenidos de Redes Sociales
          </h2>
        </div>

        <div className="contenidos-stats">
          <div className="contenido-stat">
            <div className="contenido-stat-number">{contenidosRedes.length}</div>
            <div className="contenido-stat-label">Total planificados</div>
          </div>
          <div className="contenido-stat success">
            <div className="contenido-stat-number">{contenidosPublicados}</div>
            <div className="contenido-stat-label">Publicados</div>
          </div>
          <div className="contenido-stat warning">
            <div className="contenido-stat-number">{contenidosPendientes}</div>
            <div className="contenido-stat-label">Pendientes</div>
          </div>
          <div className="contenido-stat info">
            <div className="contenido-stat-number">
              {contenidosRedes.length > 0 ? Math.round((contenidosPublicados / contenidosRedes.length) * 100) : 0}%
            </div>
            <div className="contenido-stat-label">Efectividad</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metricas;
