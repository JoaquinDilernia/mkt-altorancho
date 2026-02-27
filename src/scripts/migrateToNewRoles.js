// Script de migración al nuevo sistema de roles
// ────────────────────────────────────────────────────────────────────────
// Requisito: la app debe estar corriendo (http://localhost:5173)
//            y haber cargado al menos una página (para que config.js
//            ya haya expuesto window.__db y window.__fs).
//
// Cómo ejecutar:
//   1. Ir a http://localhost:5173 (app corriendo)
//   2. Abrir DevTools (F12) → Console
//   3. Pegar todo el contenido de este archivo y presionar Enter

(async () => {
  const db = window.__db;
  const { collection, query, where, getDocs, doc, updateDoc, deleteField } = window.__fs;

  if (!db || !collection) {
    console.error('❌ window.__db / window.__fs no disponibles. ¿Está la app cargada?');
    return;
  }

  // ── Mapa de usuarios ──────────────────────────────────────────────────
  // Ajustá los usernames si difieren de los reales en Firestore
  const MIGRACIONES = [
    // ── MARKETING ────────────────────────────────────────────────────────
    { username: 'joaco',    roleType: 'superadmin',      area: 'marketing', secciones: [] },
    { username: 'sofia',    roleType: 'coordinador',     area: 'marketing', secciones: [] },
    { username: 'santiago', roleType: 'directivo',       area: 'marketing', secciones: [] },
    { username: 'trini',    roleType: 'asistente',       area: 'marketing', secciones: ['calendario_grupal', 'redes', 'tareas', 'objetivos'] },
    { username: 'vicky',    roleType: 'community',       area: 'marketing', secciones: ['calendario_grupal', 'redes', 'tareas'] },
    { username: 'cami',     roleType: 'pauta',           area: 'marketing', secciones: ['calendario_grupal', 'tareas', 'pauta', 'metricas'] },
    { username: 'mili',     roleType: 'atencion_cliente',area: 'marketing', secciones: ['calendario_grupal', 'tareas', 'objetivos'] },
    { username: 'juli',     roleType: 'diseno',          area: 'marketing', secciones: ['calendario_grupal', 'redes', 'tareas', 'visual'] },
    { username: 'caro',     roleType: 'visual',          area: 'marketing', secciones: ['calendario_grupal', 'tareas', 'visual'] },
    // ── PRODUCTO ──────────────────────────────────────────────────────────
    { username: 'marianne', roleType: 'coordinador',     area: 'producto',  secciones: [] },
    { username: 'luli',     roleType: 'directivo',       area: 'producto',  secciones: [] },
    { username: 'sofiap',   roleType: 'producto',        area: 'producto',  secciones: ['calendario_grupal', 'tareas', 'objetivos', 'producto'] },  // ← verificar username
    { username: 'cynthia',  roleType: 'producto',        area: 'producto',  secciones: ['calendario_grupal', 'tareas', 'objetivos', 'producto'] },  // ← verificar username
    // ── LOCALES (descomentar y completar usernames reales) ─────────────────
    // { username: 'local1', roleType: 'local', area: 'locales', secciones: ['calendario_grupal', 'visual'] },
    // { username: 'local2', roleType: 'local', area: 'locales', secciones: ['calendario_grupal', 'visual'] },
    // { username: 'local3', roleType: 'local', area: 'locales', secciones: ['calendario_grupal', 'visual'] },
  ];

  // ── Migrar un usuario ─────────────────────────────────────────────────
  const migrar = async ({ username, roleType, area, secciones }) => {
    const snap = await getDocs(
      query(collection(db, 'marketingar_users'), where('username', '==', username.toLowerCase().trim()))
    );
    if (snap.empty) {
      console.warn(`⚠️  '${username}' no encontrado`);
      return false;
    }
    await updateDoc(doc(db, 'marketingar_users', snap.docs[0].id), {
      roleType,
      area,
      secciones,
      especialidad: deleteField(),
    });
    console.log(`✓  ${username.padEnd(12)} → ${roleType.padEnd(18)} | ${area}`);
    return true;
  };

  // ── Ejecutar ──────────────────────────────────────────────────────────
  console.log('━━━━ Migración de roles ━━━━');
  const resultados = await Promise.allSettled(MIGRACIONES.map(migrar));
  const ok   = resultados.filter(r => r.status === 'fulfilled' && r.value).length;
  const fail = resultados.filter(r => r.status === 'rejected' || !r.value).length;
  console.log(`\n✅ ${ok} actualizados  |  ⚠️ ${fail} no encontrados`);
})();
