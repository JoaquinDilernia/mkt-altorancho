import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Sends an email notification via EmailJS.
 * Silently skips if EmailJS keys are not configured.
 *
 * Template variables expected in EmailJS:
 *   {{to_name}}  — recipient display name
 *   {{titulo}}   — event/meeting title
 *   {{mensaje}}  — descriptive text
 *   {{tipo}}     — "Calendario Grupal" | "Reunión"
 *
 * @param {object} params
 * @param {string} params.toEmail  - recipient email address
 * @param {string} params.toName   - recipient display name
 * @param {string} params.titulo   - notification title
 * @param {string} params.mensaje  - notification body text
 * @param {string} params.tipo     - 'calendario' | 'reunion'
 */
export const sendEmailNotification = async ({ toEmail, toName, titulo, mensaje, tipo }) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) return;
  if (!toEmail) return;

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: toEmail,
      to_name:  toName || toEmail,
      titulo,
      mensaje,
      tipo: tipo === 'reunion' ? 'Reunión' : 'Calendario Grupal',
    },
    PUBLIC_KEY
  );
};
