// Datos de usuarios para crear en Firestore
// Agregar estos documentos manualmente en la colección 'marketingar_users'

const users = [
  {
    username: 'sofi',
    password: 'sofi123', // Cambiar en producción
    name: 'Sofi',
    role: 'admin',
    areas: ['Coordinación Marketing'],
    partTime: false,
    active: true
  },
  {
    username: 'trini',
    password: 'trini123',
    name: 'Trini',
    role: 'user',
    areas: ['Marketing Ecommerce', 'Locales', 'UX', 'Email Marketing'],
    partTime: false,
    active: true
  },
  {
    username: 'vicky',
    password: 'vicky123',
    name: 'Vicky',
    role: 'user',
    areas: ['Marketing Social', 'Contenidos', 'Influencers', 'Prensa'],
    partTime: false,
    active: true
  },
  {
    username: 'juli',
    password: 'juli123',
    name: 'Juli',
    role: 'user',
    areas: ['Diseño Gráfico', 'Video'],
    partTime: false,
    active: true
  },
  {
    username: 'joaco',
    password: 'joaco123',
    name: 'Joaco',
    role: 'user',
    areas: ['Ecommerce', 'Sistemas'],
    partTime: false,
    active: true
  },
  {
    username: 'cami',
    password: 'cami123',
    name: 'Cami',
    role: 'user',
    areas: ['Publicidad Digital', 'Performance'],
    partTime: false,
    active: true
  },
  {
    username: 'caro',
    password: 'caro123',
    name: 'Caro',
    role: 'user',
    areas: ['Visual Merchandising'],
    partTime: true,
    active: true
  },
  {
    username: 'mili',
    password: 'mili123',
    name: 'Mili',
    role: 'user',
    areas: ['Atención al Cliente', 'Experiencia de Compra'],
    partTime: false,
    active: true
  },
  {
    username: 'santiago ribatto',
    password: 'santi123',
    name: 'Santiago Ribatto',
    role: 'manager',
    areas: ['Dirección'],
    partTime: false,
    active: true
  }
];

export { users };
