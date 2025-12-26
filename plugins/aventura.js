import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase, inicializarUsuario, addPandacoins } from '../data/database.js';

export const command = 'aventura';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;


  const cdPath = path.resolve('./data/cooldowns.json');
  if (!fs.existsSync(cdPath)) fs.writeFileSync(cdPath, '{}');

  const cooldowns = JSON.parse(fs.readFileSync(cdPath));
  const lastTime = cooldowns[sender]?.aventura || 0;
  const now = Date.now();
  const cooldownTime = 120 * 60 * 1000;

  if (now - lastTime < cooldownTime) {
    const hoursLeft = Math.ceil((cooldownTime - (now - lastTime)) / 3600000);
    await sock.sendMessage(from, {
      text: `🕒 *Cooldown activo*\n🗺️ Espera *${hoursLeft} hora(s)* antes de ir de aventura.`
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  

  inicializarUsuario(sender, db);
  
  const user = db.users[sender];
  

  const aventuras = [
    { 
      nombre: '🌲 Bosque Encantado', 
      nivelMin: 1, 
      recompensaBase: 5000,
      expBase: 200,
      probabilidad: 0.4
    },
    { 
      nombre: '🏔️ Montañas Heladas', 
      nivelMin: 3, 
      recompensaBase: 8000,
      expBase: 350,
      probabilidad: 0.3
    },
    { 
      nombre: '🏜️ Desierto Ardiente', 
      nivelMin: 5, 
      recompensaBase: 12000,
      expBase: 500,
      probabilidad: 0.2
    },
    { 
      nombre: '🌋 Volcán en Erupción', 
      nivelMin: 8, 
      recompensaBase: 20000,
      expBase: 800,
      probabilidad: 0.08
    },
    { 
      nombre: '🏰 Ruinas Antiguas', 
      nivelMin: 12, 
      recompensaBase: 30000,
      expBase: 1200,
      probabilidad: 0.02
    }
  ];
  

  let aventuraSeleccionada = aventuras[0];
  for (const aventura of aventuras) {
    if (user.nivel >= aventura.nivelMin && aventura.recompensaBase > aventuraSeleccionada.recompensaBase) {
      aventuraSeleccionada = aventura;
    }
  }
  

  const nivelBonus = Math.floor(user.nivel * 0.8);
  const tieneArmadura = user.inventario?.herramientas?.armadura > 0;
  const tieneEspada = user.inventario?.herramientas?.espada > 0;
  

  let monedasGanadas = aventuraSeleccionada.recompensaBase + Math.floor(Math.random() * (aventuraSeleccionada.recompensaBase / 2));
  let expGanada = aventuraSeleccionada.expBase + Math.floor(Math.random() * 300);
  

  monedasGanadas += nivelBonus * 200;
  expGanada += nivelBonus * 30;
  

  if (tieneArmadura) {
    monedasGanadas = Math.floor(monedasGanadas * 1.3);
    expGanada = Math.floor(expGanada * 1.2);
  }
  
  if (tieneEspada) {
    monedasGanadas = Math.floor(monedasGanadas * 1.2);
    expGanada = Math.floor(expGanada * 1.3);
  }
  

  const suerte = Math.random();
  let eventos = [];
  let recursosExtra = {};
  

  if (suerte < 0.3) {
    const tesoros = [
      { recurso: 'oro', cantidad: 1 + Math.floor(Math.random() * 3) },
      { recurso: 'diamantes', cantidad: 1 },
      { recurso: 'esmeraldas', cantidad: 1 },
      { recurso: 'rubies', cantidad: 1 }
    ];
    
    const tesoro = tesoros[Math.floor(Math.random() * tesoros.length)];
    recursosExtra[tesoro.recurso] = tesoro.cantidad;
    eventos.push(`💎 Encontraste un tesoro con ${tesoro.cantidad} ${tesoro.recurso}`);
  }
  

  if (suerte < 0.7 && suerte >= 0.3) {
    const enemigos = ['🐺 Lobo', '🐗 Jabalí', '🐍 Serpiente', '🦅 Águila'];
    const enemigo = enemigos[Math.floor(Math.random() * enemigos.length)];
    const botin = Math.floor(Math.random() * 1000) + 500;
    monedasGanadas += botin;
    eventos.push(`⚔️ Derrotaste a un ${enemigo} (+${botin} coins)`);
  }
  

  if (suerte < 0.9 && suerte >= 0.7) {
    const objetos = [
      { nombre: '🧪 Poción de Vida', key: 'pocion', cantidad: 1 },
      { nombre: '🔑 Llave Antigua', key: 'llave', cantidad: 1 },
      { nombre: '💎 Gema Brillante', key: 'gema', cantidad: 1 }
    ];
    
    const objeto = objetos[Math.floor(Math.random() * objetos.length)];
    user.inventario.especiales[objeto.key] = (user.inventario.especiales[objeto.key] || 0) + objeto.cantidad;
    eventos.push(`✨ Encontraste una ${objeto.nombre}`);
  }
  

  if (suerte >= 0.9) {
    const descubrimientoBonus = Math.floor(monedasGanadas * 0.5);
    monedasGanadas += descubrimientoBonus;
    expGanada += 300;
    eventos.push(`🏛️ Descubriste ruinas antiguas (+${descubrimientoBonus} coins, +300 exp)`);
  }
  

  if (Math.random() < 0.5) {
    const recursosPosibles = ['piedras', 'madera', 'hierro', 'carbon'];
    const recursoEncontrado = recursosPosibles[Math.floor(Math.random() * recursosPosibles.length)];
    const cantidadRecurso = 3 + Math.floor(Math.random() * 7);
    
    user.inventario.recursos[recursoEncontrado] = 
      (user.inventario.recursos[recursoEncontrado] || 0) + cantidadRecurso;
    
    eventos.push(`📦 Encontraste ${cantidadRecurso} ${recursoEncontrado}`);
  }
  

  addPandacoins(db, sender, monedasGanadas, { sharePercent: 0.10 });
  user.exp += expGanada;
  

  for (const [recurso, cantidad] of Object.entries(recursosExtra)) {
    user.inventario.recursos[recurso] = (user.inventario.recursos[recurso] || 0) + cantidad;
  }
  

  user.stats = user.stats || {};
  user.stats.aventuras = (user.stats.aventuras || 0) + 1;
  

  const expParaSubir = user.nivel * 100;
  if (user.exp >= expParaSubir) {
    const nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel += nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    

    const bonusNivel = 2000 * nivelesSubidos;
    addPandacoins(db, sender, bonusNivel, { sharePercent: 0.10 });
    monedasGanadas += bonusNivel;
  }
  

  if (db.clanes) {
    const clanName = Object.keys(db.clanes).find(nombre => 
      db.clanes[nombre]?.miembros?.includes(sender)
    );
    if (clanName && db.clanes[clanName]) {
      db.clanes[clanName].recolectados = (db.clanes[clanName].recolectados || 0) + monedasGanadas;
    }
  }
  

  guardarDatabase(db);
  

  cooldowns[sender] = cooldowns[sender] || {};
  cooldowns[sender].aventura = now;
  fs.writeFileSync(cdPath, JSON.stringify(cooldowns, null, 2));
  

  let respuesta = `🗺️ *¡AVENTURA COMPLETADA!*\n\n`;
  respuesta += `${aventuraSeleccionada.nombre}\n`;
  respuesta += `📊 *Dificultad:* Nivel ${aventuraSeleccionada.nivelMin}+\n`;
  respuesta += `🎯 *Probabilidad:* ${Math.floor(aventuraSeleccionada.probabilidad * 100)}%\n\n`;
  
  respuesta += `📈 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `💰 Pandacoins: +${monedasGanadas.toLocaleString()}\n`;
  respuesta += `⭐ Experiencia: +${expGanada}\n`;
  

  if (tieneArmadura) respuesta += `🛡️ *Bonus Armadura:* +30% recompensas\n`;
  if (tieneEspada) respuesta += `⚔️ *Bonus Espada:* +20% recompensas\n`;
  

  if (Object.keys(recursosExtra).length > 0) {
    respuesta += `\n💎 *TESOROS ENCONTRADOS:*\n`;
    for (const [recurso, cantidad] of Object.entries(recursosExtra)) {
      const emojis = { oro: '💰', diamantes: '💎', esmeraldas: '💚', rubies: '❤️' };
      const emoji = emojis[recurso] || '💎';
      respuesta += `${emoji} ${recurso}: +${cantidad}\n`;
    }
  }
  

  if (eventos.length > 0) {
    respuesta += `\n⚡ *EVENTOS DURANTE LA AVENTURA:*\n`;
    eventos.forEach((evento, index) => {
      respuesta += `• ${evento}\n`;
    });
  }
  
  respuesta += `\n📊 *ESTADÍSTICAS:*\n`;
  respuesta += `👤 Nivel: ${user.nivel}\n`;
  respuesta += `🗺️ Aventuras completadas: ${user.stats.aventuras || 0}\n`;
  respuesta += `💎 Dinero total: ${user.pandacoins.toLocaleString()} coins\n`;
  

  if (user.exp >= expParaSubir) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL EN LA AVENTURA!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+2000 coins de bonus por nivel\n`;
  }
  
  respuesta += `\n⏰ *Próxima aventura en:* 2 horas\n`;
  respuesta += `💡 *Consejo:* Lleva armadura y espada para mejores recompensas\n`;
  respuesta += `🔧 *Mejora equipamiento:* \`.shop\``;
  

  respuesta += `\n\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `🔗 *Canal Oficial:*\n`;
  respuesta += `https://whatsapp.com/channel/0029Vb6SmfeAojYpZCHYVf0R\n`;
  respuesta += `━━━━━━━━━━━━━━━━━━━`;

  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
