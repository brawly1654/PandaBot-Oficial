import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { ownerNumber } from '../config.js';

export const command = 'claim';

// Inicializar array de spawns si no existe
if (!global.psSpawns) {
    global.psSpawns = [];
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.replace(/[^0-9]/g, '');

    // Limpiar spawns expirados primero
    const ahora = Date.now();
    global.psSpawns = global.psSpawns.filter(spawn => 
        spawn.activo && (ahora - spawn.timestamp < 10 * 60 * 1000) // 10 minutos
    );

    // Si no hay argumentos, mostrar spawns disponibles
    if (args.length === 0) {
        const spawnsActivos = global.psSpawns.filter(spawn => 
            spawn.activo && !spawn.reclamadoPor && from === spawn.grupo
        );

        if (spawnsActivos.length === 0) {
            await sock.sendMessage(from, { 
                text: '❌ No hay PS disponibles para reclamar.\n\n📝 Usa `.claim <id>` para reclamar un PS específico.' 
            });
            return;
        }

        let mensaje = `🎯 *PS Disponibles para reclamar:*\n\n`;
        spawnsActivos.forEach((spawn, index) => {
            const tiempoTranscurrido = ahora - spawn.timestamp;
            const tiempoRestante = Math.max(0, (10 * 60 * 1000) - tiempoTranscurrido);
            const minutos = Math.floor(tiempoRestante / 60000);
            const segundos = Math.floor((tiempoRestante % 60000) / 1000);
            
            mensaje += `${index + 1}. *${spawn.personaje.nombre}*\n`;
            mensaje += `   🆔 *ID:* ${spawn.id}\n`;
            mensaje += `   ⏰ *Expira en:* ${minutos}m ${segundos}s\n`;
            mensaje += `   💰 *Valor:* ${spawn.personaje.precio.toLocaleString()} 🐼\n`;
            mensaje += `   🎯 *Usa:* .claim ${spawn.id}\n\n`;
        });

        mensaje += `📝 *Total disponible:* ${spawnsActivos.length} PS`;

        await sock.sendMessage(from, { text: mensaje });
        return;
    }

    // Reclamar un PS específico
    const spawnId = args[0];
    const spawn = global.psSpawns.find(s => s.id === spawnId && s.activo && from === s.grupo);

    if (!spawn) {
        await sock.sendMessage(from, { 
            text: `❌ No se encontró un PS activo con ID: ${spawnId}\n\n📝 Usa \`.claim\` sin argumentos para ver los PS disponibles.` 
        });
        return;
    }

    if (spawn.reclamadoPor) {
        await sock.sendMessage(from, {
            text: `❌ El PS *${spawn.personaje.nombre}* ya fue reclamado por @${spawn.reclamadoPor.split('@')[0]}`,
            mentions: [spawn.reclamadoPor]
        });
        return;
    }

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] = db.users[sender] || {};
    user.personajes = user.personajes || [];
    user.pandacoins = user.pandacoins || 0;
    user.intentosFallidosClaim = user.intentosFallidosClaim || 0;

    const tiempoDesdeSpawn = ahora - spawn.timestamp;

    // Protección de 30 segundos para todos
    if (spawn.forzadoPorOwner && tiempoDesdeSpawn < 30_000) {
        user.intentosFallidosClaim += 1;
        const penalización = user.intentosFallidosClaim * 100_000_000;
        user.pandacoins = Math.max(0, user.pandacoins - penalización);

        guardarDatabase(db);

        await sock.sendMessage(from, {
            text: `⛔ Este PS está protegido por 30 segundos.\nHas perdido ${penalización.toLocaleString()} PandaCoins por intentar reclamarlo antes de tiempo.\n\n⏰ *Tiempo restante:* ${Math.ceil((30_000 - tiempoDesdeSpawn) / 1000)} segundos`
        });
        return;
    }

    // Reclamo exitoso
    user.personajes.push(spawn.personaje.nombre);
    user.intentosFallidosClaim = 0;
    spawn.reclamadoPor = sender;
    spawn.activo = false;

    guardarDatabase(db);

    // Contar PS activos restantes
    const psActivosRestantes = global.psSpawns.filter(s => s.activo && !s.reclamadoPor).length;

    await sock.sendMessage(from, {
        text: `✅ @${sender.split('@')[0]} ha reclamado a *${spawn.personaje.nombre}* exitosamente!\n\n💰 *Valor:* ${spawn.personaje.precio.toLocaleString()} 🐼\n🎯 *PS restantes:* ${psActivosRestantes} disponibles`,
        mentions: [sender]
    });

    // Notificar en el grupo si es diferente del chat privado
    if (from !== spawn.grupo) {
        await sock.sendMessage(spawn.grupo, {
            text: `✅ @${sender.split('@')[0]} ha reclamado el PS *${spawn.personaje.nombre}*!\n\n🎯 *PS restantes:* ${psActivosRestantes} disponibles`,
            mentions: [sender]
        });
    }
}
