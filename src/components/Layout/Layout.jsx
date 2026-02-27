import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiCalendar,
  FiInstagram,
  FiCheckSquare,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX,
  FiUsers,
  FiTarget,
  FiRadio,
  FiPackage,
  FiCamera,
  FiMapPin,
  FiVideo,
  FiBell,
} from 'react-icons/fi';
import { ROLE_LABELS, AREA_LABELS } from '../../utils/roles';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const { userData, logout, roleType, area } = useAuth();
  const userSecciones = userData?.secciones || [];

  const location = useLocation();
  const navigate = useNavigate();

  // ── Notificaciones ──────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifsRef = useRef(null);

  useEffect(() => {
    if (!userData?.name) return;
    const q = query(
      collection(db, 'marketingar_notificaciones'),
      where('userName', '==', userData.name),
      where('leido', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userData?.name]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const handleOpenNotifs = async () => {
    setShowNotifs(prev => !prev);
    // Mark all as read
    if (notifs.length > 0) {
      try {
        const batch = writeBatch(db);
        notifs.forEach(n => batch.update(doc(db, 'marketingar_notificaciones', n.id), { leido: true }));
        await batch.commit();
      } catch { /* silent */ }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/',           icon: FiHome,        label: 'Inicio',            access: 'all' },

    { separator: true, label: 'General' },
    { path: '/calendario', icon: FiCalendar,    label: 'Calendario Grupal', access: 'calendario_grupal' },
    { path: '/tareas',     icon: FiCheckSquare, label: 'Tareas',            access: 'tareas' },
    { path: '/objetivos',  icon: FiTarget,      label: 'Objetivos',         access: 'objetivos' },
    { path: '/reuniones',  icon: FiVideo,       label: 'Reuniones',         access: 'reuniones' },
    { path: '/metricas',   icon: FiBarChart2,   label: 'Métricas',          access: 'metricas' },

    { separator: true, label: 'Marketing' },
    { path: '/redes',      icon: FiInstagram,   label: 'Calendario Redes',  access: 'redes',    area: 'marketing' },
    { path: '/pauta',      icon: FiRadio,       label: 'Pauta',             access: 'pauta',    area: 'marketing' },
    { path: '/visual',     icon: FiCamera,      label: 'Visual',            access: 'visual',   area: 'marketing' },

    { separator: true, label: 'Producto' },
    { path: '/producto',   icon: FiPackage,     label: 'Producto',          access: 'producto', area: 'producto' },

    { separator: true, label: 'Admin' },
    { path: '/usuarios',   icon: FiUsers,       label: 'Usuarios',          access: 'admin' },
    { path: '/salas',      icon: FiMapPin,      label: 'Salas',             access: 'superadmin_only' },
  ];

  const isItemVisible = (item) => {
    if (item.separator) return true; // se limpian después
    if (roleType === 'superadmin') return true;
    if (item.access === 'superadmin_only') return false;
    if (item.access === 'admin') return roleType === 'coordinador';
    if (item.access === 'all') return true;
    if (roleType === 'coordinador' || roleType === 'directivo') {
      if (item.area && item.area !== area) return false;
      return true;
    }
    return userSecciones.includes(item.access);
  };

  // Filtra ítems y luego limpia separadores huérfanos
  const filteredMenu = (() => {
    const visible = menuItems.filter(isItemVisible);
    return visible.filter((item, idx) => {
      if (!item.separator) return true;
      const prev = visible[idx - 1];
      const next = visible[idx + 1];
      // Quitar si es el primero, el último, o si el siguiente también es separador
      if (!prev || !next || next.separator) return false;
      return true;
    });
  })();

  const rolLabel = () => {
    if (!roleType) return 'Usuario';
    const base = ROLE_LABELS[roleType] || roleType;
    const areaName = area ? (AREA_LABELS[area] || area) : null;
    if ((roleType === 'coordinador' || roleType === 'directivo') && areaName) return `${base} ${areaName}`;
    if (areaName && roleType === 'miembro') return areaName;
    return base;
  };

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img
            src="/alto. blanco tiza_Mesa de trabajo 1.png"
            alt="Alto"
            className="sidebar-logo"
          />
        </div>

        <nav className="sidebar-nav">
          {filteredMenu.map((item, idx) => {
            if (item.separator) {
              return (
                <div key={`sep-${idx}`} className="nav-separator">
                  {sidebarOpen && <span>{item.label}</span>}
                </div>
              );
            }
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}
              >
                <Icon className="nav-icon" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <FiLogOut className="nav-icon" />
            {sidebarOpen && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX /> : <FiMenu />}
          </button>

          <div className="topbar-right">
            {/* Campanita de notificaciones */}
            <div className="notif-wrapper" ref={notifsRef}>
              <button
                className={`notif-bell ${notifs.length > 0 ? 'has-notifs' : ''}`}
                onClick={handleOpenNotifs}
                title="Notificaciones"
              >
                <FiBell />
                {notifs.length > 0 && (
                  <span className="notif-badge">{notifs.length > 9 ? '9+' : notifs.length}</span>
                )}
              </button>

              {showNotifs && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-header">
                    <span>Notificaciones</span>
                  </div>
                  {notifs.length === 0 ? (
                    <div className="notif-empty">Nada nuevo por ahora</div>
                  ) : (
                    <div className="notif-list">
                      {notifs.map(n => (
                        <div key={n.id} className={`notif-item notif-${n.tipo}`}>
                          <div className="notif-titulo">{n.titulo}</div>
                          <div className="notif-mensaje">{n.mensaje}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link to="/perfil" className="user-info-link" title="Mi perfil">
              <div className="user-avatar">
                {userData?.photoURL
                  ? <img src={userData.photoURL} alt="foto" className="user-avatar-img" />
                  : (userData?.name?.charAt(0)?.toUpperCase() || 'U')
                }
              </div>
              <div className="user-details">
                <span className="user-name">{userData?.name}</span>
                <span className="user-role">{rolLabel()}</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
