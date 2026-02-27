import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login/Login';
import Layout from './components/Layout/Layout';
import Home from './components/Home/Home';
import Tareas from './components/Tareas/Tareas';
import Redes from './components/Redes/Redes';
import Calendario from './components/Calendario/Calendario';
import Metricas from './components/Metricas/Metricas';
import Usuarios from './components/Usuarios/Usuarios';
import Objetivos from './components/Objetivos/Objetivos';
import Pauta from './components/Pauta/Pauta';
import Producto from './components/Producto/Producto';
import Visual from './components/Visual/Visual';
import Perfil from './components/Perfil/Perfil';
import Salas from './components/Salas/Salas';
import Reuniones from './components/Reuniones/Reuniones';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#353434',
        color: '#e6d7b3',
        fontSize: '18px'
      }}>
        Cargando...
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Home />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="redes" element={<Redes />} />
            <Route path="tareas" element={<Tareas />} />
            <Route path="objetivos" element={<Objetivos />} />
            <Route path="metricas" element={<Metricas />} />
            <Route path="pauta" element={<Pauta />} />
            <Route path="producto" element={<Producto />} />
            <Route path="visual" element={<Visual />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="reuniones" element={<Reuniones />} />
            <Route path="salas" element={<Salas />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
