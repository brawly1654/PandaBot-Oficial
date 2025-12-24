// commands/minar.js
import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';
import { trackMinar, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';

export const command = 'minar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.minar || 0;
  const now = Date.now();
  const cooldownTime = 10 * 60 * 1000; // 10 minutos

  if (now - lastTime < cooldownTime) {
    const minutesLeft = Math.ceil((cooldownTime - (now - lastTime)) / 60000);
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n⛏️ Espera *${minutesLeft} minuto(s)* antes de volver a minar.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  const user = db.users[sender];
  
  // Recursos minables
  const recursos = [
    { nombre: '🪨 Piedra', key: 'piedras', cantidad: 3, monedas: 50, exp: 15, probabilidad: 0.5 },
    { nombre: '🪨 Carbón', key: 'carbon', cantidad: 2, monedas: 100, exp: 25, probabilidad: 0.3 },
    { nombre: '⚙️ Hierro', key: 'hierro', cantidad: 1, monedas: 200, exp: 40, probabilidad: 0.15 },
    { nombre: '💰 Oro', key: 'oro', cantidad: 1, monedas: 400, exp: 70, probabilidad: 0.04 },
    { nombre: '💎 Diamante', key: 'diamantes', cantidad: 1, monedas: 800, exp: 120, probabilidad: 0.01 }
  ];
  
  // Determinar qué recurso se mina
  const suerte = Math.random();
  let recursoMinado = null;
  let acumulado = 0;
  
  for (const recurso of recursos) {
    acumulado += recurso.probabilidad;
    if (suerte <= acumulado) {
      recursoMinado = recurso;
      break;
    }
  }
  
  // Bonus por nivel y herramientas
  const nivelBonus = Math.floor(user.nivel * 0.4);
  const tienePico = user.inventario?.herramientas?.pico > 0;
  
  let cantidadGanada = recursoMinado.cantidad + nivelBonus;
  let monedasGanadas = recursoMinado.monedas + (nivelBonus * 40);
  let expGanada = recursoMinado.exp + (nivelBonus * 5);
  
  // Bonus de pico
  if (tienePico) {
    cantidadGanada = Math.floor(cantidadGanada * 2);
    monedasGanadas = Math.floor(monedasGanadas * 1.5);
    expGanada = Math.floor(expGanada * 1.4);
  }
  
  // Actualizar recursos
  user.inventario.recursos[recursoMinado.key] = 
    (user.inventario.recursos[recursoMinado.key] || 0) + cantidadGanada;
  user.pandacoins += monedasGanadas;
  user.exp += expGanada;
  user.stats.minas = (user.stats.minas || 0) + 1;
  
  // Ocasionalmente encontrar gemas (1% de probabilidad)
  if (Math.random() < 0.01) {
    user.inventario.recursos.esmeraldas = (user.inventario.recursos.esmeraldas || 0) + 1;
  }
  
  // Verificar subida de nivel
  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    user.nivel += 1;
    user.exp = user.exp - expParaSubir;
    user.pandacoins += 1500; // Bonus mayor por minar
  }
  
  guardarDatabase(db);
  
  // Actualizar cooldown
  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].minar = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  
  // Mensaje de respuesta
  let respuesta = `⛏️ *¡MINERÍA EXITOSA!*\n\n`;
  respuesta += `${recursoMinado.nombre}\n`;
  respuesta += `📊 *Rareza:* ${Math.floor(recursoMinado.probabilidad * 100)}% de encontrar\n\n`;
  
  respuesta += `📈 *RECOMPENSAS:*\n`;
  respuesta += `${recursoMinado.nombre}: +${cantidadGanada} (Total: ${user.inventario.recursos[recursoMinado.key]})\n`;
  respuesta += `💰 Pandacoins: +${monedasGanadas}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  
  if (tienePico) respuesta += `⛏️ *Bonus Pico:* +100% recursos\n`;
  
  // Verificar si encontró gema
  if (user.inventario.recursos.esmeraldas > 0 && Math.random() < 0.01) {
    respuesta += `💚 *¡ENCONTRASTE UNA ESMERALDA RARA!*\n`;
  }
  
  respuesta += `\n📊 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `⛏️ Minas totales: ${user.stats.minas}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins} coins\n`;
  
  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+1500 coins de bonus\n`;
  }
  
  respuesta += `\n⏰ *Cooldown:* 10 minutos\n`;
  respuesta += `💡 *Consejo:* Los recursos raros valen más en el mercado`;
  
  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });

trackMinar(sender, sock, from);
  checkSpecialAchievements(sender, sock, from);
}

