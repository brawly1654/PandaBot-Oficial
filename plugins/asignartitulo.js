import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { ownerNumber } from '../config.js';
import { getAllTitles } from '../utils/titlesManager.js';

export const command = 'asignartitulo';
export const aliases = ['dartitulo', 'givetitle'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];


  if (!ownerNumber.includes(`+${sender}`)) {
    await sock.sendMessage(from, { 
      text: '❌ Solo los owners pueden usar este comando.' 
    }, { quoted: msg });
    return;
  }

  if (args.length === 0) {
    await sock.sendMessage(from, {
      text: `🎁 *ASIGNAR TÍTULO - OWNERS*\n\n📝 *Formato:*\n.asignartitulo <NombreDelTitulo> | @usuario\n\n🎯 *Ejemplos:*\n.asignartitulo 🍀 Suertudo | @usuario\n.asignartitulo 🤡 Payaso | @usuario\n\n📋 *Títulos disponibles:*\n${obtenerListaTitulos()}\n\n💡 El usuario recibirá el título en su inventario y podrá equiparlo con .title`
    }, { quoted: msg });
    return;
  }

  const input = args.join(' ');
  const parts = input.split('|').map(part => part.trim());

  if (parts.length !== 2) {
    await sock.sendMessage(from, {
      text: '❌ Formato incorrecto.\n\n💡 Usa: .asignartitulo <NombreDelTitulo> | @usuario\n\n🎯 Ejemplo: .asignartitulo 🍀 Suertudo | @usuario'
    }, { quoted: msg });
    return;
  }

  const [nombreTitulo, mencionTexto] = parts;


  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const mencionado = msg.mentionedJid?.[0] || contextInfo?.mentionedJid?.[0];

  if (!mencionado) {
    await sock.sendMessage(from, {
      text: '❌ Debes mencionar a un usuario.\n\n💡 Ejemplo: .asignartitulo 🍀 Suertudo | @usuario'
    }, { quoted: msg });
    return;
  }


  if (mencionado === (msg.key.participant || msg.key.remoteJid)) {
    await sock.sendMessage(from, {
      text: '❌ No puedes asignarte títulos a ti mismo con este comando.'
    }, { quoted: msg });
    return;
  }


  const titulos = getAllTitles();
  const tituloEncontrado = titulos.find(t => 
    t.name === nombreTitulo || 
    t.displayName === nombreTitulo ||
    t.id === nombreTitulo.toLowerCase().replace(/[^a-z0-9]/g, '_')
  );

  if (!tituloEncontrado) {
    await sock.sendMessage(from, {
      text: `❌ No se encontró el título "${nombreTitulo}"\n\n📋 *Títulos disponibles:*\n${obtenerListaTitulos()}`
    }, { quoted: msg });
    return;
  }


  const db = cargarDatabase();
  

  if (!db.users) db.users = {};
  if (!db.users[mencionado]) {
    db.users[mencionado] = {
      pandacoins: 0,
      achievements: {
        titles: [],
        selectedTitle: null
      }
    };
  }

  const user = db.users[mencionado];


  if (!user.achievements) {
    user.achievements = {
      titles: [],
      selectedTitle: null
    };
  }

  
  if (!user.achievements.titles) {
    user.achievements.titles = [];
  }


  if (user.achievements.titles.includes(tituloEncontrado.displayName)) {
    await sock.sendMessage(from, {
      text: `ℹ️ @${mencionado.split('@')[0]} ya tiene el título "${tituloEncontrado.name}"`,
      mentions: [mencionado]
    }, { quoted: msg });
    return;
  }


  user.achievements.titles.push(tituloEncontrado.displayName);
  
  guardarDatabase(db);


  const usuarioMencion = mencionado.split('@')[0];
  
  await sock.sendMessage(from, {
    text: `✅ *TÍTULO ASIGNADO EXITOSAMENTE*\n\n🏷️ *Título:* ${tituloEncontrado.name}\n👤 *Usuario:* @${usuarioMencion}\n\n💫 El usuario ahora puede equipar el título con:\n.title "${tituloEncontrado.displayName}"\n\n📋 O ver todos sus títulos con:\n.mistitles`,
    mentions: [mencionado]
  }, { quoted: msg });


  try {
    await sock.sendMessage(mencionado, {
      text: `🎁 *¡HAS RECIBIDO UN TÍTULO!*\n\n🏷️ *Título:* ${tituloEncontrado.name}\n👤 *Otorgado por:* Owner del bot\n\n💫 Para equipar este título usa:\n.title "${tituloEncontrado.displayName}"\n\n📋 Para ver todos tus títulos:\n.mistitles\n\n¡Disfruta de tu nuevo título! 🎉`
    });
  } catch (error) {
    console.log(`No se pudo notificar al usuario ${mencionado}:`, error);
  }
}


function obtenerListaTitulos() {
  const titulos = getAllTitles();
  
  if (titulos.length === 0) {
    return '📭 No hay títulos disponibles en el sistema.';
  }

  return titulos.map((titulo, index) => {
    return `${index + 1}. ${titulo.name} (${titulo.displayName}) - ${titulo.price.toLocaleString()} 🐼`;
  }).join('\n');
}


export async function verTitulosUsuario(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];


  if (!ownerNumber.includes(`+${sender}`)) {
    await sock.sendMessage(from, { 
      text: '❌ Solo los owners pueden usar este comando.' 
    }, { quoted: msg });
    return;
  }


  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const mencionado = msg.mentionedJid?.[0] || contextInfo?.mentionedJid?.[0];

  if (!mencionado) {
    await sock.sendMessage(from, {
      text: '❌ Debes mencionar a un usuario.\n\n💡 Ejemplo: .vertitulos @usuario'
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  const user = db.users?.[mencionado];

  if (!user || !user.achievements?.titles || user.achievements.titles.length === 0) {
    await sock.sendMessage(from, {
      text: `📭 @${mencionado.split('@')[0]} no tiene títulos en su inventario.`,
      mentions: [mencionado]
    }, { quoted: msg });
    return;
  }

  const titulosUsuario = user.achievements.titles;
  const tituloEquipado = user.achievements.selectedTitle;

  let texto = `📋 *TÍTULOS DE @${mencionado.split('@')[0]}*\n\n`;
  
  titulosUsuario.forEach((titulo, index) => {
    const emoji = titulo === tituloEquipado ? '⭐' : '🔹';
    texto += `${emoji} ${index + 1}. ${titulo}\n`;
  });

  texto += `\n📊 Total: ${titulosUsuario.length} títulos`;
  
  if (tituloEquipado) {
    texto += `\n⭐ Equipado: ${tituloEquipado}`;
  }

  await sock.sendMessage(from, {
    text: texto,
    mentions: [mencionado]
  }, { quoted: msg });
}
