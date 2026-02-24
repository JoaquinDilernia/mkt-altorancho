import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
} from 'react-icons/fi';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { userData, logout, isAdmin, isManager } = useAuth();

  // Secciones por defecto según rol (para usuarios sin secciones configuradas)
  const DEFAULT_SECCIONES = {
    user: ['calendario_grupal', 'redes', 'tareas', 'objetivos', 'metricas'],
    producto: ['calendario_grupal', 'producto', 'visual'],
    visual: ['calendario_grupal', 'producto', 'visual'],
    locales: ['calendario_grupal', 'producto', 'visual'],
  };
  const seccionesConfiguradas = userData?.secciones !== undefined;
  const userSecciones = seccionesConfiguradas
    ? (userData?.secciones || [])
    : (DEFAULT_SECCIONES[userData?.role] || []);

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Inicio', access: 'all' },
    { path: '/calendario', icon: FiCalendar, label: 'Calendario Grupal', access: 'calendario_grupal' },
    { path: '/redes', icon: FiInstagram, label: 'Calendario Redes', access: 'redes' },
    { path: '/tareas', icon: FiCheckSquare, label: 'Tareas', access: 'tareas' },
    { path: '/objetivos', icon: FiTarget, label: 'Objetivos', access: 'objetivos' },
    { path: '/pauta', icon: FiRadio, label: 'Pauta', access: 'pauta' },
    { path: '/metricas', icon: FiBarChart2, label: 'Métricas', access: 'metricas' },
    { path: '/producto', icon: FiPackage, label: 'Producto', access: 'producto' },
    { path: '/visual', icon: FiCamera, label: 'Visual', access: 'visual' },
    { path: '/usuarios', icon: FiUsers, label: 'Usuarios', access: 'admin' },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (item.access === 'all') return true;
    if (item.access === 'admin') return isAdmin;
    if (isAdmin) return true;
    if (item.access === 'tareas' || item.access === 'objetivos') {
      return !isManager && userSecciones.includes(item.access);
    }
    if (isManager) return item.access !== 'pauta';
    return userSecciones.includes(item.access);
  });

  const rolLabel = () => {
    if (isAdmin) return 'Admin';
    if (isManager) return 'Dirección';
    const role = userData?.role;
    if (role === 'producto') return 'Producto';
    if (role === 'visual') return 'Visual';
    if (role === 'locales') return 'Locales';
    return 'Usuario';
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img
            src="/alto. blanco tiza_Mesa de trabajo 1.png"
            alt="Alto"
            className="sidebar-logo"
          />
          {sidebarOpen && <span className="sidebar-title">Marketing</span>}
        </div>

        <nav className="sidebar-nav">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
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

          <div className="user-info">
            <div className="user-avatar">
              {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{userData?.name}</span>
              <span className="user-role">{rolLabel()}</span>
            </div>
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
