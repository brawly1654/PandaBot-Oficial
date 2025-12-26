// clan.js
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'clan';

const MAX_MEMBERS = 3;

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  db.users = db.users || {};
  db.clanes = db.clanes || {};

  const subCommand = (args[0] || '').toLowerCase();
  const nombreClan = args.slice(1).join(' ').trim();

  switch (subCommand) {
    case 'crear': {
      if (!nombreClan) return await sock.sendMessage(from, { text: '❌ Debes poner un nombre para el clan.' }, { quoted: msg });
      if (db.clanes[nombreClan]) return await sock.sendMessage(from, { text: '❌ Ya existe un clan con ese nombre.' }, { quoted: msg });
      if (getClanDeUsuario(sender, db)) return await sock.sendMessage(from, { text: '❌ Ya estás en un clan.' }, { quoted: msg });

      db.clanes[nombreClan] = {
        creador: sender,
        miembros: [sender],
        recolectados: 0
      };
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Clan *${nombreClan}* creado. Líder: @${sender.split('@')[0]}`, mentions: [sender] }, { quoted: msg });
      break;
    }

    case 'unir': {
      if (!nombreClan || !db.clanes[nombreClan]) return await sock.sendMessage(from, { text: '❌ Clan no encontrado.' }, { quoted: msg });
      if (getClanDeUsuario(sender, db)) return await sock.sendMessage(from, { text: '❌ Ya estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[nombreClan];
      if (clan.miembros.length >= MAX_MEMBERS) {
        return await sock.sendMessage(from, { text: `❌ El clan *${nombreClan}* ya alcanzó el límite de ${MAX_MEMBERS} miembros.` }, { quoted: msg });
      }
      clan.miembros.push(sender);
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Te uniste al clan *${nombreClan}*.` }, { quoted: msg });
      break;
    }

    case 'expulsar': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[clanUser];
      if (clan.creador !== sender) return await sock.sendMessage(from, { text: '❌ Solo el creador puede expulsar miembros.' }, { quoted: msg });
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return await sock.sendMessage(from, { text: '❌ Debes mencionar a alguien para expulsar.' }, { quoted: msg });
      const expulsado = mentioned[0];
      if (!clan.miembros.includes(expulsado)) return await sock.sendMessage(from, { text: '❌ Esa persona no está en tu clan.' }, { quoted: msg });
      if (expulsado === clan.creador) return await sock.sendMessage(from, { text: '❌ No puedes expulsar al creador.' }, { quoted: msg });
      clan.miembros = clan.miembros.filter(m => m !== expulsado);
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Expulsaste a @${expulsado.split('@')[0]}`, mentions: [expulsado] }, { quoted: msg });
      break;
    }

    case 'salir': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[clanUser];
      clan.miembros = clan.miembros.filter(m => m !== sender);

      if (clan.creador === sender) {
        if (clan.miembros.length > 0) {

          clan.creador = clan.miembros[0];
          await sock.sendMessage(from, { text: `⚠️ El creador salió. Nuevo líder: @${clan.creador.split('@')[0]}`, mentions: [clan.creador] }, { quoted: msg });
        } else {

          delete db.clanes[clanUser];
          await sock.sendMessage(from, { text: `✅ Clan *${clanUser}* eliminado (sin miembros).` }, { quoted: msg });
          guardarDatabase(db);
          break;
        }
        
      }

      guardarDatabase(db);
      await sock.sendMessage(from, { text: '✅ Saliste del clan.' }, { quoted: msg });
      break;
    }

    case 'revisar':
    case 'info': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[clanUser];
      let texto = `🏰 *Clan:* ${clanUser}\n👑 Lider: @${clan.creador.split('@')[0]}\n\n👥 Miembros:\n`;
      texto += clan.miembros.map(m => `- @${m.split('@')[0]}`).join('\n');
      texto += `\n\n💰 Fondo del clan: ${clan.recolectados} pandacoins`;
      await sock.sendMessage(from, { text: texto, mentions: clan.miembros }, { quoted: msg });
      break;
    }

    case 'top': {
      if (!Object.keys(db.clanes).length) return await sock.sendMessage(from, { text: '📉 No hay clanes registrados.' }, { quoted: msg });
      const top = Object.entries(db.clanes)
        .sort((a, b) => b[1].recolectados - a[1].recolectados)
        .map(([nombre, data], i) => `${i + 1}. ${nombre} — 💰 ${data.recolectados} pandacoins`)
        .slice(0, 10)
        .join('\n');
      await sock.sendMessage(from, { text: `🏆 *Top Clanes:*\n\n${top}` }, { quoted: msg });
      break;
    }

    case 'donar': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const cantidad = parseInt(args[1]);
      if (!cantidad || cantidad <= 0) return await sock.sendMessage(from, { text: '❌ Especifica una cantidad válida para donar.' }, { quoted: msg });
      const user = db.users[sender] || (db.users[sender] = { pandacoins: 0 });
      if ((user.pandacoins || 0) < cantidad) return await sock.sendMessage(from, { text: '❌ No tienes suficientes pandacoins.' }, { quoted: msg });
      user.pandacoins -= cantidad;
      db.clanes[clanUser].recolectados = (db.clanes[clanUser].recolectados || 0) + cantidad;
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Donaste ${cantidad.toLocaleString()} pandacoins al clan *${clanUser}*.` }, { quoted: msg });
      break;
    }

    case 'recolectar':
    case 'cobrar': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[clanUser];
      if (clan.creador !== sender) return await sock.sendMessage(from, { text: '❌ Solo el creador puede distribuir los fondos.' }, { quoted: msg });
      const fondo = clan.recolectados || 0;
      if (fondo <= 0) return await sock.sendMessage(from, { text: '📭 No hay fondos para distribuir.' }, { quoted: msg });
      const miembros = clan.miembros || [];
      const share = Math.floor(fondo / miembros.length);
      if (share <= 0) return await sock.sendMessage(from, { text: '📉 Fondos insuficientes para distribuir equitativamente.' }, { quoted: msg });
      miembros.forEach(m => {
        db.users[m] = db.users[m] || { pandacoins: 0 };
        db.users[m].pandacoins = (db.users[m].pandacoins || 0) + share;
      });
      const totalDistribuido = share * miembros.length;
      clan.recolectados -= totalDistribuido;
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Distribuidos ${share.toLocaleString()} pandacoins a cada miembro. Total: ${totalDistribuido.toLocaleString()} pandacoins.`, mentions: miembros }, { quoted: msg });
      break;
    }

    case 'lider':
    case 'promover': {
      const clanUser = getClanDeUsuario(sender, db);
      if (!clanUser) return await sock.sendMessage(from, { text: '❌ No estás en un clan.' }, { quoted: msg });
      const clan = db.clanes[clanUser];
      if (clan.creador !== sender) return await sock.sendMessage(from, { text: '❌ Solo el creador puede transferir el liderazgo.' }, { quoted: msg });
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return await sock.sendMessage(from, { text: '❌ Menciona al miembro que será el nuevo líder.' }, { quoted: msg });
      const nuevo = mentioned[0];
      if (!clan.miembros.includes(nuevo)) return await sock.sendMessage(from, { text: '❌ Esa persona no pertenece al clan.' }, { quoted: msg });
      clan.creador = nuevo;
      guardarDatabase(db);
      await sock.sendMessage(from, { text: `✅ Lider transferido a @${nuevo.split('@')[0]}`, mentions: [nuevo] }, { quoted: msg });
      break;
    }

    default: {
      const help = `📜 Comandos de clan:\n+.clan crear <nombre>\n+.clan unir <nombre>\n+.clan expulsar @usuario\n+.clan salir\n+.clan revisar|info\n+.clan top\n+.clan donar <cantidad>\n+.clan recolectar|cobrar (solo creador)\n+.clan lider @usuario (transferir liderazgo)`;
      await sock.sendMessage(from, { text: help }, { quoted: msg });
    }
  }
}

function getClanDeUsuario(usuario, db) {
  return Object.keys(db.clanes).find(nombre => db.clanes[nombre].miembros.includes(usuario)) || null;
}
