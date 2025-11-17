import { subirNivel } from "../PandaLove/pizzeria.js";
import { checkAchievements, initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'lvlup';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  
  // ✅ Inicializar achievements si no existen
  const db = cargarDatabase();
  if (!db.users[sender]?.achievements) {
    initializeAchievements(sender);
  }

  const loadingMsg = await sock.sendMessage(from, { text: `⏳ Subiendo de nivel tu pizzería...` });

  try {
    const response = await subirNivel(sender);

    if (response.number === 400) {
      await sock.sendMessage(from, { text: `❌ No cumples con los requisitos para subir de nivel. Usa *.lvlpizzeria* para verlos.${response.error}`}, { quoted: loadingMsg });
      return;
    }

    if (response.error) {
      await sock.sendMessage(from, { text: `*❌ Error al subir de nivel: ${response.error}.*` }, { quoted: loadingMsg });
      return;
    }

    const { message, new_level, remaining_coins, next_level_info } = response;

    // ✅ Actualizar nivel de pizzería en la base de datos local
    if (db.users[sender] && db.users[sender].pizzeria) {
      db.users[sender].pizzeria.level = new_level;
      guardarDatabase(db);
    }

    let successMessage = `
✅ *¡${message}*

*Nuevo Nivel:* ${new_level}
*PizzaCoins Restantes:* ${remaining_coins.toFixed(2)}
`;

    if (next_level_info) {
      successMessage += `
--- Información del Próximo Nivel ---
*Costo:* ${next_level_info.precio_siguiente_nivel}
*Asientos Máximos:* ${next_level_info.max_chairs}
*Calidad Mínima:* ${next_level_info.min_quality}
`;
    } else {
      successMessage += `
*¡Has alcanzado el nivel máximo!*
`;
    }

    await sock.sendMessage(from, { text: successMessage });

    // ✅ Verificar logros de nivel de pizzería
    checkAchievements(sender, sock, from);

  } catch (error) {
    console.error('❌ Error al conectar con la API de la pizzería:', error);
    await sock.sendMessage(from, { text: `*❌ Hubo un error de conexión con la API de la pizzería. Inténtalo más tarde.*` });
  }
}
