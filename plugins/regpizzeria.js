import { registrarPizzeria } from "../PandaLove/pizzeria.js";
import { checkAchievements, initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'regpizzeria';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  
  // ✅ Inicializar achievements si no existen
  const db = cargarDatabase();
  if (!db.users[sender]?.achievements) {
    initializeAchievements(sender);
  }

  const loadingMsg = await sock.sendMessage(from, { text: `🍕 Registrando tu pizzería...` });

  try {
    const response = await registrarPizzeria(sender);

    if (response.number === 200) {
      // ✅ Actualizar estado de pizzería en la base de datos local
      if (db.users[sender]) {
        db.users[sender].pizzeria = {
          registered: true,
          level: 1,
          registered_date: Date.now()
        };
        guardarDatabase(db);
      }
      
      await sock.sendMessage(from, { text: `*✅ ¡Felicidades! Tu pizzería ha sido registrada con éxito. Asegúrate de usar .pzzname para darle un nombre a tu Pizzeria.*` }, { quoted: loadingMsg });
      
      // ✅ Verificar logro de registro de pizzería
      checkAchievements(sender, sock, from);
      
    } else {
      await sock.sendMessage(from, { text: `*Ya tienes una pizzería registrada.🐼*` }, { quoted: loadingMsg });
    }
  } catch (error) {
    console.error('❌ Error al conectar con la API de la pizzería:', error);
    await sock.sendMessage(from, { text: `*❌ Hubo un error de conexión con la API de la pizzería. Inténtalo más tarde.*` });
  }
}
