// commands/pescar.js
import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'pescar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Sistema de cooldown
  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.pescar || 0;
  const now = Date.now();
  const cooldownTime = 3 * 60 * 1000; // 3 minutos

  if (now - lastTime < cooldownTime) {
    const minutesLeft = Math.ceil((cooldownTime - (now - lastTime)) / 60000);
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n🎣 Espera *${minutesLeft} minuto(s)* antes de volver a pescar.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  
  // Inicializar usuario si no existe
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];
  
  // Recompensas basadas en nivel y suerte
  const nivelBonus = Math.floor(user.nivel * 0.5);
  const suerte = Math.random();
  
  let pescadoGanado = 1;
  let monedasGanadas = 5000;
  let expGanada = 200;
  let itemEspecial = null;
  
  // Pesca básica (siempre obtienes algo)
  if (suerte < 0.7) { // 70% pesca normal
    pescadoGanado = 1 + Math.floor(Math.random() * 2) + nivelBonus;
    monedasGanadas = 300 + Math.floor(Math.random() * 200) + (nivelBonus * 50);
    expGanada = 30 + Math.floor(Math.random() * 20);
  } 
  // Pesca buena (25%)
  else if (suerte < 0.95) {
    pescadoGanado = 3 + Math.floor(Math.random() * 3) + nivelBonus;
    monedasGanadas = 500 + Math.floor(Math.random() * 300) + (nivelBonus * 80);
    expGanada = 50 + Math.floor(Math.random() * 30);
  } 
  // Pesca excelente (5%)
  else {
    pescadoGanado = 5 + Math.floor(Math.random() * 5) + nivelBonus;
    monedasGanadas = 800 + Math.floor(Math.random() * 500) + (nivelBonus * 120);
    expGanada = 80 + Math.floor(Math.random() * 50);
    itemEspecial = 'pocion'; // 5% de obtener poción
  }
  
  // Aplicar bonus si tiene caña
  const tieneCaña = user.inventario?.herramientas?.caña > 0;
  if (tieneCaña) {
    pescadoGanado = Math.floor(pescadoGanado * 1.5);
    monedasGanadas = Math.floor(monedasGanadas * 1.3);
  }
  
  // Actualizar recursos
  user.inventario.recursos.pescado = (user.inventario.recursos.pescado || 0) + pescadoGanado;
  user.pandacoins += monedasGanadas;
  user.exp += expGanada;
  user.stats.pescas = (user.stats.pescas || 0) + 1;
  
  // Agregar item especial si hubo
  if (itemEspecial) {
    user.inventario.especiales[itemEspecial] = (user.inventario.especiales[itemEspecial] || 0) + 1;
  }
  
  // Verificar subida de nivel
  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    user.nivel += 1;
    user.exp = user.exp - expParaSubir;
    user.pandacoins += 500; // Bonus por subir nivel
  }
  
  // Actualizar clan si existe
  if (db.clanes) {
    const clanName = Object.keys(db.clanes).find(nombre => 
      db.clanes[nombre]?.miembros?.includes(sender)
    );
    if (clanName && db.clanes[clanName]) {
      db.clanes[clanName].recolectados = (db.clanes[clanName].recolectados || 0) + monedasGanadas;
    }
  }
  
  // Guardar cambios
  guardarDatabase(db);
  
  // Actualizar cooldown
  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].pescar = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  
  // Mensaje de respuesta
  let respuesta = `🎣 *¡PESCA EXITOSA!*\n\n`;
  
  if (suerte < 0.7) {
    respuesta += `🌊 *Tipo:* Pesca Normal\n`;
  } else if (suerte < 0.95) {
    respuesta += `🌊 *Tipo:* Pesca Buena 🌟\n`;
  } else {
    respuesta += `🌊 *Tipo:* PESCA EXCELENTE ⭐⭐⭐\n`;
  }
  
  if (tieneCaña) {
    respuesta += `🎣 *Bonus:* Caña de pescar (+50% recursos)\n`;
  }
  
  respuesta += `\n📊 *RECOMPENSAS:*\n`;
  respuesta += `🐟 Pescado: +${pescadoGanado} (Total: ${user.inventario.recursos.pescado})\n`;
  respuesta += `💰 Pandacoins: +${monedasGanadas}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  
  if (itemEspecial) {
    respuesta += `🧪 Poción: +1 (¡Encontrada en el agua!)\n`;
  }
  
  respuesta += `\n📈 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `🎣 Pescas totales: ${user.stats.pescas}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins} coins\n`;
  
  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+500 coins de bonus\n`;
  }
  
  respuesta += `\n⏰ *Cooldown:* 3 minutos\n`;
  respuesta += `💡 *Consejo:* Compra una caña (\`.shop\`) para mejores resultados`;
  
  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
