# Marketing Workspace - Altorancho

Sistema interno de gestión para el equipo de Marketing de Altorancho.

## 🎯 Funcionalidades

### ✅ Implementado

- **Autenticación** - Login simple con username/password (sin email)
- **Gestión de Tareas** - Sistema completo con estados, urgencias, asignación y historial
- **Calendario de Redes Sociales** - Planificación mensual de contenido con múltiples canales
- **Calendario Grupal** - Eventos y actividades del equipo por semana
- **Dashboard** - Panel principal con estadísticas
- **Sidebar navegación** - Menú lateral con permisos por rol

### 🚧 Pendientes

- Métricas y reportes
- Gestión de usuarios (CRUD completo)
- Edición de tareas y eventos
- Filtros avanzados
- Notificaciones
- Exportar datos

## 👥 Roles y Usuarios

### Admin
- **Username:** sofia
- **Password:** altolett123
- Acceso total al sistema

### Usuarios
Los usuarios se crean en Firestore con la estructura definida en `SETUP_FIREBASE.md`

## 🚀 Instalación y Uso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Firebase
- Las credenciales ya están en `.env`
- Crear colección `marketingar_users` en Firestore
- Ver `SETUP_FIREBASE.md` para estructura de datos

### 3. Inicializar usuario admin
- Ejecutar `npm run dev`
- Abrir http://localhost:5173/login
- Hacer click en "Crear Usuario Admin"
- Login con: sofia / altolett123

### 4. Desarrollo
```bash
npm run dev
```

### 5. Build para producción
```bash
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── Login/          # Pantalla de login
│   ├── Layout/         # Sidebar y navegación
│   ├── Home/           # Dashboard principal
│   ├── Tareas/         # Gestión de tareas
│   ├── Redes/          # Calendario de redes sociales
│   ├── Calendario/     # Calendario grupal
│   └── InitDB/         # Utilidad para crear usuarios
├── context/
│   └── AuthContext.jsx # Contexto de autenticación
├── firebase/
│   └── config.js       # Configuración de Firebase
└── utils/
    └── setupUsers.js   # Datos de usuarios
```

## 🎨 Paleta de Colores

- **Primario:** #353434 (gris oscuro)
- **Secundario:** #462829 (marrón)
- **Accent:** #e6d7b3 (beige)
- **Blanco:** #ffffff

## 🔥 Firebase Collections

### `marketingar_users`
Usuarios del sistema

### `marketingar_tareas`
Tareas del equipo

### `marketingar_redes`
Contenido de redes sociales

### `marketingar_calendario`
Eventos del calendario grupal

## 📦 Dependencias Principales

- React 19
- React Router DOM
- Firebase
- Framer Motion
- React Icons
- date-fns
- Vite

## 🔐 Seguridad

Este es un sistema **interno** con autenticación básica. 
**No usar en producción pública** sin implementar:
- Hashing de contraseñas
- Firebase Authentication
- Reglas de seguridad en Firestore
- HTTPS

## 📝 Notas

- Las contraseñas están en texto plano (solo para uso interno)
- Prefijo `marketingar_` en todas las colecciones
- Sesión guardada en localStorage
- Diseño responsive

---

Desarrollado para Altorancho - Equipo de Marketing
