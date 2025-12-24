// commands/trabajar.js
import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';
import { trackTrabajar, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';

export const command = 'trabajar';
export const aliases = ['w', 'work', 'chamba', 'chambear', 'laburo'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.trabajar || 0;
  const now = Date.now();
  const cooldownTime = 3 * 60 * 60 * 1000;

  if (now - lastTime < cooldownTime) {
    const hoursLeft = Math.ceil((cooldownTime - (now - lastTime)) / (60 * 60 * 1000));
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n💼 Vuelve a trabajar en *${hoursLeft} hora(s)*.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  const user = db.users[sender];
  
  // Trabajos disponibles según nivel
  const trabajos = [
    { nombre: '🧹 Limpiador', monedas: 500, exp: 50, nivelMinimo: 1 },
    { nombre: '🍽️ Mesero', monedas: 800, exp: 80, nivelMinimo: 3 },
    { nombre: '🛠️ Carpintero', monedas: 1200, exp: 120, nivelMinimo: 5 },
    { nombre: '⚙️ Herrero', monedas: 2000, exp: 200, nivelMinimo: 8 },
    { nombre: '🏰 Constructor', monedas: 3000, exp: 300, nivelMinimo: 12 },
    { nombre: '👑 Rey', monedas: 5000, exp: 500, nivelMinimo: 15 }
  ];
  
  // Encontrar el mejor trabajo disponible según nivel
  let trabajoSeleccionado = trabajos[0];
  for (const trabajo of trabajos) {
    if (user.nivel >= trabajo.nivelMinimo && trabajo.monedas > trabajoSeleccionado.monedas) {
      trabajoSeleccionado = trabajo;
    }
  }
  
  // Recompensas base
  let monedasGanadas = trabajoSeleccionado.monedas;
  let expGanada = trabajoSeleccionado.exp;
  
  // Bonus por estadísticas
  const bonusPorNivel = Math.floor(user.nivel * 50);
  const bonusPorMisiones = Math.floor((user.stats.misiones_completadas || 0) * 10);
  
  monedasGanadas += bonusPorNivel + bonusPorMisiones;
  expGanada += Math.floor(bonusPorNivel / 10);
  
  // Ocasionalmente obtener recursos extra (30% de probabilidad)
  let recursosExtra = '';
  if (Math.random() < 0.3) {
    const recursosPosibles = ['comida', 'piedras', 'madera'];
    const recursoExtra = recursosPosibles[Math.floor(Math.random() * recursosPosibles.length)];
    const cantidadExtra = 1 + Math.floor(Math.random() * 3);
    
    user.inventario.recursos[recursoExtra] = 
      (user.inventario.recursos[recursoExtra] || 0) + cantidadExtra;
    
    recursosExtra = `\n🎁 *Extra:* +${cantidadExtra} ${recursoExtra}`;
  }
  
  // Actualizar recursos
  user.pandacoins += monedasGanadas;
  user.exp += expGanada;
  
  // Verificar subida de nivel
  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    user.nivel += 1;
    user.exp = user.exp - expParaSubir;
    // Bonus extra por subir nivel trabajando
    monedasGanadas += 1000;
    user.pandacoins += 1000;
  }
  
  guardarDatabase(db);
  
  // Actualizar cooldown
  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].trabajar = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  
  // Mensaje de respuesta
  let respuesta = `💼 *¡TRABAJO COMPLETADO!*\n\n`;
  respuesta += `👔 *Puesto:* ${trabajoSeleccionado.nombre}\n`;
  respuesta += `📊 *Requerido:* Nivel ${trabajoSeleccionado.nivelMinimo}+\n\n`;
  
  respuesta += `📈 *SALARIO:*\n`;
  respuesta += `💰 Pandacoins: +${monedasGanadas}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  
  if (bonusPorNivel > 0) {
    respuesta += `📈 *Bonus por nivel (${user.nivel}):* +${bonusPorNivel} coins\n`;
  }
  
  if (bonusPorMisiones > 0) {
    respuesta += `🎯 *Bonus por misiones (${user.stats.misiones_completadas || 0}):* +${bonusPorMisiones} coins\n`;
  }
  
  respuesta += recursosExtra;
  
  respuesta += `\n📊 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins} coins\n`;
  respuesta += `🎯 Misiones completadas: ${user.stats.misiones_completadas || 0}\n`;
  
  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+1000 coins de bonus extra\n`;
  }
  
  respuesta += `\n⏰ *Próximo trabajo en:* 3 horas\n`;
  respuesta += `💡 *Consejo:* Sube de nivel para acceder a trabajos mejores pagados`;
  
  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });

trackTrabajar(sender, sock, from);
  checkSpecialAchievements(sender, sock, from);
}
