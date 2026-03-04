import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion } from 'framer-motion';
import { FiCalendar, FiCheckSquare, FiInstagram, FiTrendingUp, FiClock, FiAlertTriangle, FiVideo, FiArrowRight } from 'react-icons/fi';
import { format, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import './Home.css';

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const Home = () => {
  const { userData, isAdmin, isCoordinator, isManager } = useAuth();
  const canManage = isAdmin || isCoordinator;
  const [tareas, setTareas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [eventosMencionado, setEventosMencionado] = useState([]);
  const [misReuniones, setMisReuniones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubTareas = () => {}; // Función vacía por defecto
    
    // Manager no ve tareas
    if (!isManager) {
      const tareasQuery = canManage
        ? query(collection(db, 'marketingar_tareas'), orderBy('fechaCarga', 'desc'), limit(5))
        : query(
            collection(db, 'marketingar_tareas'),
            where('asignadoId', '==', userData.id)
          );

      unsubTareas = onSnapshot(tareasQuery, (snapshot) => {
        let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!canManage) {
          // ordenar y limitar client-side para evitar index compuesto
          docs = docs
            .sort((a, b) => (b.fechaCarga?.toMillis?.() ?? 0) - (a.fechaCarga?.toMillis?.() ?? 0))
            .slice(0, 10);
        }
        setTareas(docs);
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

    // Reuniones próximas donde soy participante
    const hoyStr = toDateStr(hoy);
    const en14Dias = toDateStr(addDays(hoy, 14));
    const reunionesQuery = query(
      collection(db, 'marketingar_reuniones'),
      where('fecha', '>=', hoyStr),
      where('fecha', '<=', en14Dias),
      orderBy('fecha', 'asc')
    );
    const unsubReuniones = onSnapshot(reunionesQuery, (snapshot) => {
      const todas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // solo las donde soy participante
      const mias = todas.filter(r =>
        Array.isArray(r.participantes) && r.participantes.some(p => p.id === userData.id)
      );
      setMisReuniones(mias);
    });

    return () => {
      unsubTareas();
      unsubEventos();
      unsubEventosMencion();
      unsubReuniones();
    };
  }, [userData, canManage, isManager]);

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
  const tareasActivas = canManage
    ? allTareas.filter(t => t.estado !== 'finalizado').length
    : misTareas.filter(t => t.estado !== 'finalizado').length;

  const tareasCompletadasMes = canManage
    ? allTareas.filter(t => t.estado === 'finalizado').length
    : misTareas.filter(t => t.estado === 'finalizado').length;

  const isVencida = (t) => {
    if (!t.fechaEntrega || t.estado === 'finalizado') return false;
    const fecha = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega);
    return fecha < new Date();
  };

  const tareasVencidasLista = canManage
    ? allTareas.filter(isVencida)
    : misTareas.filter(isVencida);

  const tareasVencidas = tareasVencidasLista.length;

  const contenidosPublicados = allContenidos.filter(c =>
    c.publicado || (c.publicaciones && Object.values(c.publicaciones).some(p => p?.publicado))
  ).length;
  const contenidosProgramados = allContenidos.length;

  const quickStats = isManager
    ? [
        { icon: FiCalendar, label: 'Eventos Esta Semana', value: eventos.length, color: '#353434' },
        { icon: FiInstagram, label: 'Posts Programados', value: contenidosProgramados, color: '#e6d7b3', textColor: '#462829' },
        { icon: FiInstagram, label: 'Posts Publicados', value: contenidosPublicados, color: '#462829' },
      ]
    : [
        { icon: FiCheckSquare, label: 'Tareas Activas', value: tareasActivas, color: '#462829' },
        ...(tareasVencidas > 0 ? [{ icon: FiAlertTriangle, label: 'Tareas Vencidas', value: tareasVencidas, color: '#dc2626' }] : []),
        { icon: FiCalendar, label: 'Eventos Esta Semana', value: eventos.length, color: '#353434' },
        { icon: FiTrendingUp, label: 'Completadas', value: tareasCompletadasMes, color: '#10b981' },
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
        <h1>{getGreeting()}, {userData?.name}!</h1>
        <p className="welcome-subtitle">
          {canManage
            ? 'Panel de administración del equipo'
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

      {/* REUNIONES — primero y siempre visible */}
      <motion.section
        className="reuniones-destacadas"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="reuniones-destacadas-header">
          <div className="reuniones-header-icon"><FiVideo /></div>
          <div>
            <h2>Mis Reuniones</h2>
            <span>Próximos 14 días</span>
          </div>
          <Link to="/reuniones" className="reuniones-ver-todas">
            Ver calendario <FiArrowRight />
          </Link>
        </div>
        {misReuniones.length === 0 ? (
          <div className="reuniones-empty">
            <FiVideo />
            <p>No tenés reuniones programadas en los próximos 14 días</p>
          </div>
        ) : (
          <div className="reuniones-destacadas-list">
            {misReuniones.map(r => {
              if (!r.fecha) return null;
              const [yy, mm, dd] = r.fecha.split('-').map(Number);
              const fecha = new Date(yy, mm - 1, dd);
              const esHoy = isSameDay(fecha, new Date());
              const esMañana = isSameDay(fecha, addDays(new Date(), 1));
              const diasRestantes = Math.ceil((fecha - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={r.id} className={`reunion-destacada-item${esHoy ? ' hoy' : ''}`}>
                  <div className="reunion-fecha-badge">
                    <div className="reunion-dia">{format(fecha, 'd')}</div>
                    <div className="reunion-mes">{format(fecha, 'MMM', { locale: es })}</div>
                    <div className="reunion-dow">{format(fecha, 'EEE', { locale: es })}</div>
                  </div>
                  <div className="reunion-info">
                    <div className="reunion-titulo">{r.titulo}</div>
                    <div className="reunion-horario">
                      <FiClock /> {r.horaInicio} – {r.horaFin}
                    </div>
                    {r.tipo && <span className="reunion-tipo">{r.tipo}</span>}
                  </div>
                  <div className="reunion-actions">
                    {esHoy && <span className="reunion-hoy-badge">HOY</span>}
                    {!esHoy && esMañana && <span className="reunion-pronto-badge">MAÑANA</span>}
                    {!esHoy && !esMañana && diasRestantes <= 3 && (
                      <span className="reunion-pronto-badge">En {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}</span>
                    )}
                    {r.linkMeet && (
                      <a href={r.linkMeet} target="_blank" rel="noreferrer" className="btn-unirse">
                        Unirse
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

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

      {!isManager && tareasVencidas > 0 && (
        <motion.div
          className="vencidas-alert"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="vencidas-header">
            <FiAlertTriangle />
            <h3>
              {tareasVencidas === 1
                ? `Tenés 1 tarea vencida`
                : `Tenés ${tareasVencidas} tareas vencidas`}
            </h3>
          </div>
          <div className="vencidas-list">
            {tareasVencidasLista.slice(0, 4).map(t => {
              const fecha = t.fechaEntrega.toDate ? t.fechaEntrega.toDate() : new Date(t.fechaEntrega);
              const diasAtras = Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24));
              return (
                <div key={t.id} className="vencida-item">
                  <div className="vencida-titulo">{t.titulo}</div>
                  <div className="vencida-meta">
                    {canManage && <span className="vencida-asignado">{t.asignadoNombre}</span>}
                    <span className="vencida-dias">
                      {diasAtras === 0 ? 'Venció hoy' : `Hace ${diasAtras} día${diasAtras !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
              );
            })}
            {tareasVencidasLista.length > 4 && (
              <div className="vencidas-more">+{tareasVencidasLista.length - 4} más en Tareas</div>
            )}
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
              <FiCheckSquare /> {canManage ? 'Tareas Recientes' : 'Mis Tareas Pendientes'}
            </h2>
            <div className="tareas-list">
              {tareas.length === 0 ? (
                <div className="empty-state">
                  <FiCheckSquare />
                  <p>No hay tareas pendientes</p>
                </div>
              ) : (
                tareas.map(tarea => (
                  <div key={tarea.id} className={`tarea-item${isVencida(tarea) ? ' vencida' : ''}`}>
                    <div className="tarea-item-header">
                      <span className={`tarea-badge ${tarea.urgencia}`}>
                        {tarea.urgencia}
                      </span>
                      <span className={`tarea-estado ${tarea.estado}`}>
                        {tarea.estado?.replace('_', ' ')}
                      </span>
                      {isVencida(tarea) && (
                        <span className="tarea-badge-vencida">Vencida</span>
                      )}
                    </div>
                    <div className="tarea-item-title">{tarea.titulo}</div>
                    {canManage && (
                      <div className="tarea-item-asignado">
                        Asignado a: {tarea.asignadoNombre}
                      </div>
                    )}
                    {tarea.fechaEntrega && (
                      <div className={`tarea-item-fecha${isVencida(tarea) ? ' vencida' : ''}`}>
                        <FiClock />
                        Entrega: {format(tarea.fechaEntrega.toDate ? tarea.fechaEntrega.toDate() : new Date(tarea.fechaEntrega), 'dd/MM/yyyy')}
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
