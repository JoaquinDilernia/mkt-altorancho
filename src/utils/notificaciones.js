import { collection, addDoc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { sendEmailNotification } from './sendEmail';

/**
 * Writes notification documents for a list of user names.
 * Also sends an email if the user has configured one in their profile.
 * Called after creating a calendar event or reunion.
 *
 * @param {string[]} userNames  - array of userData.name values to notify
 * @param {object}   data
 *   - tipo:         'calendario' | 'reunion'
 *   - titulo:       event/meeting title
 *   - mensaje:      descriptive text
 *   - referenciaId: event/meeting Firestore document id (optional)
 *   - creadoPor:    name of the creator (to exclude self-notification)
 */
export const notificarParticipantes = async (userNames, { tipo, titulo, mensaje, referenciaId, creadoPor }) => {
  const destinatarios = userNames.filter(n => n && n !== creadoPor);
  if (!destinatarios.length) return;

  // 1. Write in-app notifications
  await Promise.all(
    destinatarios.map(userName =>
      addDoc(collection(db, 'marketingar_notificaciones'), {
        userName,
        tipo,
        titulo,
        mensaje,
        referenciaId: referenciaId || null,
        leido: false,
        createdAt: serverTimestamp(),
      })
    )
  );

  // 2. Send email notifications (best-effort, won't block or throw)
  Promise.all(
    destinatarios.map(async (userName) => {
      try {
        const snap = await getDocs(
          query(collection(db, 'marketingar_users'), where('name', '==', userName), limit(1))
        );
        if (snap.empty) return;
        const userData = snap.docs[0].data();
        if (!userData.email) return;
        await sendEmailNotification({
          toEmail: userData.email,
          toName:  userData.name,
          titulo,
          mensaje,
          tipo,
        });
      } catch {
        // Silent — email failure should never affect the rest of the app
      }
    })
  ).catch(() => {});
};
