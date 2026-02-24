// Utilidades para manejo de fechas en zona horaria de Argentina (UTC-3)

/**
 * Convierte una fecha en formato YYYY-MM-DD a un objeto Date con hora local de Argentina
 * Esto evita que JavaScript use UTC y cambie el día
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  // Crear fecha a las 12:00 hora local para evitar problemas de zona horaria
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Convierte una fecha con hora en formato YYYY-MM-DD HH:mm a Date local
 */
export const parseLocalDateTime = (dateString, timeString) => {
  if (!dateString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  }
  
  return new Date(year, month - 1, day, 12, 0, 0);
};

/**
 * Formatea una fecha a YYYY-MM-DD para inputs de tipo date
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una hora a HH:mm para inputs de tipo time
 */
export const formatTimeForInput = (date) => {
  if (!date) return '';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

/**
 * Obtiene la fecha actual a las 12:00 para evitar problemas de zona horaria
 */
export const getTodayLocal = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
};

/**
 * Compara si dos fechas son del mismo día (ignorando hora)
 */
export const isSameDay = (date1, date2) => {
  const d1 = date1.toDate ? date1.toDate() : new Date(date1);
  const d2 = date2.toDate ? date2.toDate() : new Date(date2);
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};
