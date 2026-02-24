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
  const { userData, logout, isAdmin, isManager, isProducto, isVisual, isLocales } = useAuth();
  const username = userData?.username;
  const PAUTA_USERS = ['sofia', 'cami', 'vicky', 'juli'];

  // Roles del portal de Producto/Visual (NO ven marketing)
  const isNewRole = isProducto || isVisual || isLocales;

  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Inicio', access: 'all' },
    { path: '/calendario', icon: FiCalendar, label: 'Calendario Grupal', access: 'calendario_grupal' },
    { path: '/redes', icon: FiInstagram, label: 'Calendario Redes', access: 'marketing' },
    { path: '/tareas', icon: FiCheckSquare, label: 'Tareas', access: 'marketing_edit' },
    { path: '/objetivos', icon: FiTarget, label: 'Objetivos', access: 'marketing_edit' },
    { path: '/pauta', icon: FiRadio, label: 'Pauta', access: 'pauta' },
    { path: '/metricas', icon: FiBarChart2, label: 'Métricas', access: 'marketing' },
    { path: '/producto', icon: FiPackage, label: 'Producto', access: 'producto_portal' },
    { path: '/visual', icon: FiCamera, label: 'Visual', access: 'visual_portal' },
    { path: '/usuarios', icon: FiUsers, label: 'Usuarios', access: 'admin' },
  ];

  const filteredMenu = menuItems.filter(item => {
    switch (item.access) {
      case 'all':             return true;
      case 'admin':           return isAdmin;
      case 'calendario_grupal': return isAdmin || isManager || !isNewRole || isVisual || isProducto;
      case 'marketing':       return isAdmin || isManager || !isNewRole;
      case 'marketing_edit':  return isAdmin || (!isManager && !isNewRole);
      case 'pauta':           return PAUTA_USERS.includes(username);
      case 'producto_portal': return isAdmin || isManager || isProducto || isVisual || isLocales;
      case 'visual_portal':   return isAdmin || isManager || isVisual || isLocales;
      default:                return true;
    }
  });

  const rolLabel = () => {
    if (isAdmin) return 'Admin';
    if (isManager) return 'Dirección';
    if (isProducto) return 'Producto';
    if (isVisual) return 'Visual';
    if (isLocales) return 'Locales';
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
