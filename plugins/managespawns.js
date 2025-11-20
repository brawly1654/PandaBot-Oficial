import { ownerNumber } from '../config.js';

export const command = 'managespawns';

// Inicializar array de spawns si no existe
if (!global.psSpawns) {
    global.psSpawns = [];
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    const isOwner = ownerNumber.includes(`+${senderNumber}`);

    if (!isOwner) {
        await sock.sendMessage(from, { text: '❌ Solo los Owners pueden usar este comando.' });
        return;
    }

    const accion = args[0]?.toLowerCase();

    // Limpiar spawns expirados
    const ahora = Date.now();
    global.psSpawns = global.psSpawns.filter(spawn => 
        spawn.activo && (ahora - spawn.timestamp < 10 * 60 * 1000)
    );

    if (accion === 'list' || !accion) {
        const spawnsActivos = global.psSpawns.filter(spawn => spawn.activo);
        const spawnsReclamados = global.psSpawns.filter(spawn => !spawn.activo || spawn.reclamadoPor);

        let mensaje = `📊 *Gestión de Spawns*\n\n`;
        mensaje += `🎯 *Activos:* ${spawnsActivos.length}\n`;
        mensaje += `✅ *Reclamados:* ${spawnsReclamados.length}\n`;
        mensaje += `📝 *Total:* ${global.psSpawns.length}\n\n`;

        if (spawnsActivos.length > 0) {
            mensaje += `*PS Activos:*\n`;
            spawnsActivos.forEach((spawn, index) => {
                const tiempoTranscurrido = ahora - spawn.timestamp;
                const tiempoRestante = Math.max(0, (10 * 60 * 1000) - tiempoTranscurrido);
                const minutos = Math.floor(tiempoRestante / 60000);
                const segundos = Math.floor((tiempoRestante % 60000) / 1000);
                
                mensaje += `${index + 1}. *${spawn.personaje.nombre}*\n`;
                mensaje += `   🆔 ${spawn.id} | ⏰ ${minutos}m ${segundos}s\n`;
            });
        }

        if (spawnsReclamados.length > 0) {
            mensaje += `\n*PS Reclamados:*\n`;
            spawnsReclamados.slice(0, 5).forEach((spawn, index) => {
                const reclamador = spawn.reclamadoPor ? `@${spawn.reclamadoPor.split('@')[0]}` : 'Expiró';
                mensaje += `${index + 1}. *${spawn.personaje.nombre}* → ${reclamador}\n`;
            });
            if (spawnsReclamados.length > 5) {
                mensaje += `... y ${spawnsReclamados.length - 5} más`;
            }
        }

        await sock.sendMessage(from, { text: mensaje });
        return;
    }

    if (accion === 'clear') {
        const cantidadEliminados = global.psSpawns.length;
        global.psSpawns = [];
        await sock.sendMessage(from, { 
            text: `🧹 *Todos los spawns han sido eliminados*\n\n📊 Se eliminaron ${cantidadEliminados} spawns del sistema.` 
        });
        return;
    }

    if (accion === 'cleanexpired') {
        const cantidadAntes = global.psSpawns.length;
        global.psSpawns = global.psSpawns.filter(spawn => 
            spawn.activo && (ahora - spawn.timestamp < 10 * 60 * 1000)
        );
        const cantidadEliminados = cantidadAntes - global.psSpawns.length;
        
        await sock.sendMessage(from, { 
            text: `🔄 *Spawns expirados limpiados*\n\n🗑️ Eliminados: ${cantidadEliminados}\n📊 Restantes: ${global.psSpawns.length}` 
        });
        return;
    }

    await sock.sendMessage(from, {
        text: `❌ Uso: .managespawns <accion>\n\n📝 Acciones disponibles:\n• list - Ver todos los spawns\n• clear - Eliminar todos los spawns\n• cleanexpired - Limpiar spawns expirados`
    });
}
