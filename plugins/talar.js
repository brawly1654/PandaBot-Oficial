// commands/talar.js
import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'talar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.talar || 0;
  const now = Date.now();
  const cooldownTime = 4 * 60 * 1000; // 4 minutos

  if (now - lastTime < cooldownTime) {
    const minutesLeft = Math.ceil((cooldownTime - (now - lastTime)) / 60000);
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n🪓 Espera *${minutesLeft} minuto(s)* antes de volver a talar.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  const user = db.users[sender];
  
  // Tipos de árboles
  const arboles = [
    { nombre: '🌲 Pino', madera: 2, monedas: 80, exp: 25, probabilidad: 0.5 },
    { nombre: '🌳 Roble', madera: 3, monedas: 120, exp: 35, probabilidad: 0.3 },
    { nombre: '🎄 Abeto', madera: 4, monedas: 160, exp: 45, probabilidad: 0.15 },
    { nombre: '🌴 Palma', madera: 5, monedas: 200, exp: 60, probabilidad: 0.04 },
    { nombre: '🪵 Ébano', madera: 8, monedas: 400, exp: 100, probabilidad: 0.01 }
  ];
  
  // Determinar qué árbol se tala
  const suerte = Math.random();
  let arbolTalado = null;
  let acumulado = 0;
  
  for (const arbol of arboles) {
    acumulado += arbol.probabilidad;
    if (suerte <= acumulado) {
      arbolTalado = arbol;
      break;
    }
  }
  
  // Bonus por nivel y herramientas
  const nivelBonus = Math.floor(user.nivel * 0.3);
  const tieneHacha = user.inventario?.herramientas?.hacha > 0;
  
  let maderaGanada = arbolTalado.madera + nivelBonus;
  let monedasGanadas = arbolTalado.monedas + (nivelBonus * 30);
  let expGanada = arbolTalado.exp + (nivelBonus * 5);
  
  // Bonus de hacha
  if (tieneHacha) {
    maderaGanada = Math.floor(maderaGanada * 1.8);
    monedasGanadas = Math.floor(monedasGanadas * 1.4);
    expGanada = Math.floor(expGanada * 1.3);
  }
  
  // Actualizar recursos
  user.inventario.recursos.madera = (user.inventario.recursos.madera || 0) + maderaGanada;
  user.pandacoins += monedasGanadas;
  user.exp += expGanada;
  
  // Ocasionalmente encontrar frutas (10% de probabilidad)
  if (Math.random() < 0.1) {
    user.inventario.recursos.comida = (user.inventario.recursos.comida || 0) + 1;
  }
  
  // Verificar subida de nivel
  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    user.nivel += 1;
    user.exp = user.exp - expParaSubir;
    user.pandacoins += 800;
  }
  
  guardarDatabase(db);
  
  // Actualizar cooldown
  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].talar = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  
  // Mensaje de respuesta
  let respuesta = `🪓 *¡TALA EXITOSA!*\n\n`;
  respuesta += `${arbolTalado.nombre}\n`;
  respuesta += `📊 *Calidad:* ${Math.floor(arbolTalado.probabilidad * 100)}% de encontrar\n\n`;
  
  respuesta += `📈 *RECOMPENSAS:*\n`;
  respuesta += `🪵 Madera: +${maderaGanada} (Total: ${user.inventario.recursos.madera})\n`;
  respuesta += `💰 Pandacoins: +${monedasGanadas}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  
  if (tieneHacha) respuesta += `🪓 *Bonus Hacha:* +80% madera\n`;
  
  // Verificar si encontró fruta
  if (Math.random() < 0.1) {
    respuesta += `🍎 *¡ENCONTRASTE UNA FRUTA!*\n`;
  }
  
  respuesta += `\n📊 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins} coins\n`;
  
  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+800 coins de bonus\n`;
  }
  
  respuesta += `\n⏰ *Cooldown:* 4 minutos\n`;
  respuesta += `💡 *Consejo:* La madera es útil para construir y craftear`;
  
  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
