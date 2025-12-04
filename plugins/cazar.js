// commands/cazar.js
import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'cazar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.cazar || 0;
  const now = Date.now();
  const cooldownTime = 5 * 60 * 1000; // 5 minutos

  if (now - lastTime < cooldownTime) {
    const minutesLeft = Math.ceil((cooldownTime - (now - lastTime)) / 60000);
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n🏹 Espera *${minutesLeft} minuto(s)* antes de volver a cazar.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  const user = db.users[sender];
  
  // Animales disponibles para cazar
  const animales = [
    { nombre: '🐇 Conejo', carne: 1, cuero: 0, monedas: 100, exp: 20, probabilidad: 0.4 },
    { nombre: '🦌 Ciervo', carne: 2, cuero: 1, monedas: 200, exp: 40, probabilidad: 0.3 },
    { nombre: '🐗 Jabalí', carne: 3, cuero: 1, monedas: 300, exp: 60, probabilidad: 0.2 },
    { nombre: '🐻 Oso', carne: 5, cuero: 2, monedas: 500, exp: 100, probabilidad: 0.08 },
    { nombre: '🦁 León', carne: 7, cuero: 3, monedas: 800, exp: 150, probabilidad: 0.02 }
  ];
  
  const suerte = Math.random();
  let animalCazado = null;
  let acumulado = 0;
  
  for (const animal of animales) {
    acumulado += animal.probabilidad;
    if (suerte <= acumulado) {
      animalCazado = animal;
      break;
    }
  }
  
  // Bonus por nivel y herramientas
  const nivelBonus = Math.floor(user.nivel * 0.3);
  const tieneArco = user.inventario?.herramientas?.arco > 0;
  const tieneEspada = user.inventario?.herramientas?.espada > 0;
  
  let carneGanada = animalCazado.carne + nivelBonus;
  let cueroGanado = animalCazado.cuero;
  let monedasGanadas = animalCazado.monedas + (nivelBonus * 30);
  let expGanada = animalCazado.exp + nivelBonus;
  
  // Bonus de herramientas
  if (tieneArco) {
    carneGanada = Math.floor(carneGanada * 1.4);
    monedasGanadas = Math.floor(monedasGanadas * 1.2);
  }
  if (tieneEspada) {
    cueroGanado = Math.floor(cueroGanado * 2);
    expGanada = Math.floor(expGanada * 1.3);
  }
  
  // Actualizar recursos
  user.inventario.recursos.carne = (user.inventario.recursos.carne || 0) + carneGanada;
  user.inventario.recursos.cuero = (user.inventario.recursos.cuero || 0) + cueroGanado;
  user.pandacoins += monedasGanadas;
  user.exp += expGanada;
  user.stats.cazas = (user.stats.cazas || 0) + 1;
  
  // Verificar subida de nivel
  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    user.nivel += 1;
    user.exp = user.exp - expParaSubir;
    user.pandacoins += 1000; // Bonus mayor por cazar
  }
  
  guardarDatabase(db);
  
  // Actualizar cooldown
  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].cazar = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  
  // Mensaje de respuesta
  let respuesta = `🏹 *¡CAZA EXITOSA!*\n\n`;
  respuesta += `${animalCazado.nombre}\n`;
  respuesta += `📊 *Dificultad:* ${animalCazado.probabilidad * 100}% de aparecer\n\n`;
  
  respuesta += `📈 *RECOMPENSAS:*\n`;
  respuesta += `🥩 Carne: +${carneGanada} (Total: ${user.inventario.recursos.carne})\n`;
  if (cueroGanado > 0) {
    respuesta += `🧵 Cuero: +${cueroGanado} (Total: ${user.inventario.recursos.cuero})\n`;
  }
  respuesta += `💰 Pandacoins: +${monedasGanadas}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  
  if (tieneArco) respuesta += `🎯 *Bonus Arco:* +40% carne\n`;
  if (tieneEspada) respuesta += `⚔️ *Bonus Espada:* +100% cuero\n`;
  
  respuesta += `\n📊 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `🏹 Cazas totales: ${user.stats.cazas}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins} coins\n`;
  
  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+1000 coins de bonus\n`;
  }
  
  respuesta += `\n⏰ *Cooldown:* 5 minutos\n`;
  respuesta += `💡 *Consejo:* Compra herramientas (\`.shop\`) para mejores recompensas`;
  
  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
