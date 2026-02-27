// ─── Constantes de Roles y Áreas ──────────────────────────────────────────────
// Cada usuario tiene UN solo rol (roleType) que ya describe su función.
// No hay campo "especialidad" separado.

export const ROLES = {
  // Gestión (acceso completo o amplio)
  SUPERADMIN:      'superadmin',
  COORDINADOR:     'coordinador',
  DIRECTIVO:       'directivo',
  // Marketing (área: 'marketing')
  ASISTENTE:       'asistente',
  COMMUNITY:       'community',
  PAUTA:           'pauta',
  ATENCION_CLIENTE: 'atencion_cliente',
  DISENO:          'diseno',
  VISUAL:          'visual',
  // Producto (área: 'producto')
  PRODUCTO:        'producto',
  // Locales (área: 'locales')
  LOCAL:           'local',
};

export const AREAS = {
  MARKETING: 'marketing',
  PRODUCTO:  'producto',
  LOCALES:   'locales',
};

export const ROLE_LABELS = {
  superadmin:       'Super Admin',
  coordinador:      'Coordinador/a',
  directivo:        'Directivo/a',
  asistente:        'Asistente de Marketing',
  community:        'Community Manager',
  pauta:            'Pauta',
  atencion_cliente: 'Atención al Cliente',
  diseno:           'Diseño Gráfico',
  visual:           'Visual',
  producto:         'Producto',
  local:            'Local',
};

export const AREA_LABELS = {
  marketing: 'Marketing',
  producto:  'Producto',
  locales:   'Locales',
};

// Roles de gestión: no necesitan restricción por secciones
export const MANAGEMENT_ROLES = ['superadmin', 'coordinador', 'directivo'];

// Secciones del menú disponibles por área (para asignar a miembros)
export const SECCIONES_POR_AREA = {
  marketing: [
    { key: 'calendario_grupal', label: 'Calendario Grupal' },
    { key: 'redes',             label: 'Calendario Redes' },
    { key: 'tareas',            label: 'Tareas' },
    { key: 'objetivos',         label: 'Objetivos' },
    { key: 'pauta',             label: 'Pauta' },
    { key: 'metricas',          label: 'Métricas' },
    { key: 'visual',            label: 'Visual' },
    { key: 'reuniones',         label: 'Reuniones' },
  ],
  producto: [
    { key: 'calendario_grupal', label: 'Calendario Grupal' },
    { key: 'tareas',            label: 'Tareas' },
    { key: 'objetivos',         label: 'Objetivos' },
    { key: 'metricas',          label: 'Métricas' },
    { key: 'producto',          label: 'Producto' },
    { key: 'reuniones',         label: 'Reuniones' },
  ],
  locales: [
    { key: 'calendario_grupal', label: 'Calendario Grupal' },
    { key: 'metricas',          label: 'Métricas' },
    { key: 'visual',            label: 'Visual' },
    { key: 'reuniones',         label: 'Reuniones' },
  ],
};

// Helper: ¿puede el usuario gestionar a otro usuario?
export const puedeGestionarUsuario = (gestor, objetivo) => {
  if (gestor.roleType === 'superadmin') return true;
  if (gestor.roleType === 'coordinador') {
    return objetivo.area === gestor.area && objetivo.roleType !== 'superadmin';
  }
  return false;
};
