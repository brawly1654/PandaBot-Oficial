import { registrarPizzeria, obtenerPizzeria } from "../PandaLove/pizzeria.js";
import { checkAchievements, initializeAchievements, unlockAchievement } from '../data/achievementsDB.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'regpizzeria';
export const aliases = ['registrarpizzeria', 'iniciarpizzeria'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const db = cargarDatabase();

  if (!db.users[sender]?.achievements) {
    initializeAchievements(sender);
  }

  const loadingMsg = await sock.sendMessage(
    from,
    { text: `🍕 Registrando tu pizzería...` }
  );

  try {
    const existente = await obtenerPizzeria(sender);

    if (existente && !existente.error) {
      await unlockAchievement(sender, 'pizzero_1', sock, from);

      await sock.sendMessage(
        from,
        { text: `*🍕 Ya tienes una pizzería registrada. 🐼*` },
        { quoted: loadingMsg }
      );
      return;
    }

    const response = await registrarPizzeria(sender);

    if (response.number === 200) {
      if (db.users[sender]) {
        db.users[sender].pizzeria = {
          registered: true,
          level: 1,
          registered_date: Date.now()
        };
        guardarDatabase(db);
      }

      await unlockAchievement(sender, 'pizzero_1', sock, from);

      await sock.sendMessage(
        from,
        { text: `*✅ ¡Felicidades! Tu pizzería ha sido registrada con éxito. Asegúrate de usar .pzzname para darle un nombre a tu Pizzeria.*` },
        { quoted: loadingMsg }
      );
    }

  } catch (error) {
    console.error('❌ Error al conectar con la API de la pizzería:', error);
    await sock.sendMessage(
      from,
      { text: `*❌ Hubo un error de conexión con la API de la pizzería. Inténtalo más tarde.*` }
    );
  }
}
