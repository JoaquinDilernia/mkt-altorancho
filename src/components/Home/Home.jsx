import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion } from 'framer-motion';
import { FiCalendar, FiCheckSquare, FiInstagram, FiTrendingUp, FiClock } from 'react-icons/fi';
import { format, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import './Home.css';

const Home = () => {
  const { userData, isAdmin, isManager } = useAuth();
  const [tareas, setTareas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [eventosMencionado, setEventosMencionado] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubTareas = () => {}; // Función vacía por defecto
    
    // Manager no ve tareas
    if (!isManager) {
      const tareasQuery = isAdmin
        ? query(collection(db, 'marketingar_tareas'), orderBy('fechaCarga', 'desc'), limit(5))
        : query(
            collection(db, 'marketingar_tareas'),
            where('asignadoId', '==', userData.id),
            orderBy('fechaCarga', 'desc'),
            limit(10)
          );

      unsubTareas = onSnapshot(tareasQuery, (snapshot) => {
        setTareas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    // Próximos eventos (esta semana)
    const hoy = new Date();
    const proximaSemana = addDays(hoy, 7);
    
    const eventosQuery = query(
      collection(db, 'marketingar_calendario'),
      where('fecha', '>=', hoy),
      where('fecha', '<=', proximaSemana),
      orderBy('fecha', 'asc'),
      limit(5)
    );

    const unsubEventos = onSnapshot(eventosQuery, (snapshot) => {
      setEventos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Eventos donde estoy mencionado (próximos 20 días)
    const dentro20Dias = addDays(hoy, 20);
    const eventosMencionQuery = query(
      collection(db, 'marketingar_calendario'),
      where('fecha', '>=', hoy),
      where('fecha', '<=', dentro20Dias),
      orderBy('fecha', 'asc')
    );

    const unsubEventosMencion = onSnapshot(eventosMencionQuery, (snapshot) => {
      const todosEventos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filtrar solo eventos donde estoy mencionado
      const mencionado = todosEventos.filter(evento => 
        evento.participantes && evento.participantes.includes(userData.name)
      );
      setEventosMencionado(mencionado);
      setLoading(false);
    });

    return () => {
      unsubTareas();
      unsubEventos();
      unsubEventosMencion();
    };
  }, [userData, isAdmin, isManager]);

  // Calcular estadísticas
  const [allTareas, setAllTareas] = useState([]);
  const [allContenidos, setAllContenidos] = useState([]);

  useEffect(() => {
    const unsubAllTareas = onSnapshot(collection(db, 'marketingar_tareas'), (snapshot) => {
      setAllTareas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubContenidos = onSnapshot(collection(db, 'marketingar_redes'), (snapshot) => {
      setAllContenidos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAllTareas();
      unsubContenidos();
    };
  }, []);

  const misTareas = allTareas.filter(t => t.asignadoId === userData?.id);
  const tareasActivas = isAdmin 
    ? allTareas.filter(t => t.estado !== 'finalizado').length
    : misTareas.filter(t => t.estado !== 'finalizado').length;
  
  const tareasCompletadasMes = isAdmin
    ? allTareas.filter(t => t.estado === 'finalizado').length
    : misTareas.filter(t => t.estado === 'finalizado').length;

  const contenidosPublicados = allContenidos.filter(c =>
    c.publicado || (c.publicaciones && Object.values(c.publicaciones).some(p => p?.publicado))
  ).length;
  const contenidosProgramados = allContenidos.length;

  const quickStats = isManager 
    ? [
        { icon: FiCalendar, label: 'Eventos Esta Semana', value: eventos.length, color: '#353434' },
        { icon: FiInstagram, label: 'Posts Programados', value: contenidosProgramados, color: '#e6d7b3' },
        { icon: FiInstagram, label: 'Posts Publicados', value: contenidosPublicados, color: '#462829' },
      ]
    : [
        { icon: FiCheckSquare, label: 'Tareas Activas', value: tareasActivas, color: '#462829' },
        { icon: FiCalendar, label: 'Eventos Esta Semana', value: eventos.length, color: '#353434' },
        { icon: FiInstagram, label: 'Posts Programados', value: contenidosProgramados, color: '#e6d7b3' },
        { icon: FiTrendingUp, label: 'Completadas Este Mes', value: tareasCompletadasMes, color: '#462829' },
      ];

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="home">
      <motion.div 
        className="welcome-section"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Hola, {userData?.name}! 👋</h1>
        <p className="welcome-subtitle">
          {isAdmin 
            ? 'Panel de administración del equipo de marketing' 
            : isManager
            ? 'Panel de visualización ejecutiva'
            : 'Bienvenido a tu espacio de trabajo'
          }
        </p>
      </motion.div>

      <div className="stats-grid">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon" style={{ background: stat.color }}>
                <Icon />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {eventosMencionado.length > 0 && (
        <motion.div
          className="menciones-alert"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="menciones-header">
            <FiCalendar />
            <h3>Eventos donde estás mencionado (próximos 20 días)</h3>
          </div>
          <div className="menciones-list">
            {eventosMencionado.map(evento => {
              const fecha = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
              const diasRestantes = Math.ceil((fecha - new Date()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={evento.id} className="mencion-item">
                  <div className="mencion-fecha">
                    <div className="mencion-dia">{format(fecha, 'd')}</div>
                    <div className="mencion-mes">{format(fecha, 'MMM', { locale: es })}</div>
                  </div>
                  <div className="mencion-info">
                    <div className="mencion-titulo">{evento.titulo}</div>
                    <div className="mencion-meta">
                      <span className="mencion-tipo">{evento.tipo}</span>
                      {evento.hora && (
                        <span className="mencion-hora">
                          <FiClock /> {evento.hora}
                        </span>
                      )}
                      <span className={`mencion-dias ${diasRestantes <= 3 ? 'urgente' : ''}`}>
                        {diasRestantes === 0 ? 'HOY' : diasRestantes === 1 ? 'MAÑANA' : `En ${diasRestantes} días`}
                      </span>
                    </div>
                    {evento.descripcion && (
                      <div className="mencion-desc">{evento.descripcion}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="dashboard-sections">
        {!isManager && (
          <motion.section 
            className="dashboard-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2>
              <FiCheckSquare /> {isAdmin ? 'Tareas Recientes' : 'Mis Tareas Pendientes'}
            </h2>
            <div className="tareas-list">
              {tareas.length === 0 ? (
                <div className="empty-state">
                  <FiCheckSquare />
                  <p>No hay tareas pendientes</p>
                </div>
              ) : (
                tareas.map(tarea => (
                  <div key={tarea.id} className="tarea-item">
                    <div className="tarea-item-header">
                      <span className={`tarea-badge ${tarea.urgencia}`}>
                        {tarea.urgencia}
                      </span>
                      <span className={`tarea-estado ${tarea.estado}`}>
                        {tarea.estado?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="tarea-item-title">{tarea.titulo}</div>
                    {isAdmin && (
                      <div className="tarea-item-asignado">
                        Asignado a: {tarea.asignadoNombre}
                      </div>
                    )}
                    {tarea.fechaEntrega && (
                      <div className="tarea-item-fecha">
                        <FiClock />
                      Entrega: {format(tarea.fechaEntrega.toDate(), 'dd/MM/yyyy')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.section>        )}
        <motion.section 
          className="dashboard-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2>
            <FiCalendar /> Próximos Eventos
          </h2>
          <div className="eventos-list">
            {eventos.length === 0 ? (
              <div className="empty-state">
                <FiCalendar />
                <p>No hay eventos programados</p>
              </div>
            ) : (
              eventos.map(evento => {
                const fecha = evento.fecha.toDate ? evento.fecha.toDate() : new Date(evento.fecha);
                const esHoy = isSameDay(fecha, new Date());
                
                return (
                  <div key={evento.id} className={`evento-item ${esHoy ? 'hoy' : ''}`}>
                    <div className="evento-fecha">
                      <div className="evento-dia">{format(fecha, 'd')}</div>
                      <div className="evento-mes">{format(fecha, 'MMM', { locale: es })}</div>
                    </div>
                    <div className="evento-info">
                      <div className="evento-titulo">{evento.titulo}</div>
                      <div className="evento-tipo">{evento.tipo}</div>
                      {evento.hora && (
                        <div className="evento-hora">
                          <FiClock /> {evento.hora}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Home;
