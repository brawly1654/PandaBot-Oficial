import fs from 'fs';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { ownerNumber } from '../config.js';
import { multiplicadores } from './buy.js';

export const command = 'spawn';

// Inicializar array de spawns si no existe
if (!global.psSpawns) {
    global.psSpawns = [];
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] || {};
    const senderNumber = sender.split('@')[0];
    const isOwner = ownerNumber.includes(`+${senderNumber}`);

    if (!isOwner) {
        await sock.sendMessage(from, { text: '❌ Solo los Owners pueden usar este comando.' });
        return;
    }

    const input = args.join(' ').trim();

    if (!input) {
        const efectosList = Object.entries(multiplicadores)
            .map(([emoji, mult]) => `- ${emoji} → x${mult}`)
            .join('\n');
        await sock.sendMessage(from, {
            text: `🎭 *Efectos disponibles para .spawn:*\n\n${efectosList}\n\nUsa:\n.spawn <nombre> | efecto1 | efecto2...`,
        });
        return;
    }

    const partes = input.split('|').map(p => p.trim()).filter(p => p.length > 0);
    const nombreBase = partes[0].toLowerCase();
    const efectos = partes.slice(1).filter(e => multiplicadores[e]);
    const data = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
    const personajes = data.characters;
    const personaje = personajes.find(p => p.nombre.toLowerCase() === nombreBase);

    if (!personaje) {
        await sock.sendMessage(from, { text: '❌ No se encontró ese personaje.' });
        return;
    }

    const nombreConEfectos = `${personaje.nombre} ${efectos.join(' ')}`.trim();
    const precioBase = personaje.precio || 1000;
    const multiplicadorFinal = efectos.reduce((acc, e) => acc * multiplicadores[e], 1);
    const precioFinal = Math.floor(precioBase * multiplicadorFinal);

    const personajeModificado = {
        ...personaje,
        nombre: nombreConEfectos,
        precio: precioFinal,
        calidad: personaje.calidad || 'custom',
        efectos,
        base: personaje.nombre
    };

    const yaExiste = personajes.some(p => p.nombre === nombreConEfectos);
    if (!yaExiste) {
        personajes.push(personajeModificado);
        fs.writeFileSync('./data/personajes.json', JSON.stringify({ characters: personajes }, null, 2));
    }

    // 🔥 CREAR NUEVO SPAWN CON ID ÚNICO
    const spawnId = Date.now().toString();
    const nuevoSpawn = {
        id: spawnId,
        activo: true,
        personaje: personajeModificado,
        grupo: '120363402403091432@g.us', // Ajusta el grupo según necesites
        reclamadoPor: null,
        timestamp: Date.now(),
        forzadoPorOwner: isOwner
    };

    // Agregar al array de spawns activos
    global.psSpawns.push(nuevoSpawn);

    // Limpiar spawns expirados (más de 10 minutos)
    const ahora = Date.now();
    global.psSpawns = global.psSpawns.filter(spawn => 
        spawn.activo && (ahora - spawn.timestamp < 10 * 60 * 1000) // 10 minutos
    );

    await sock.sendMessage(nuevoSpawn.grupo, {
        text: `> Este personaje está protegido durante 30 segundos por el Creador\n🌀 A SECRET PS HAS SPAWNED IN THIS GROUP!\nUse *.claim ${spawnId}* to get *${nombreConEfectos}* before anyone else!\n\n🆔 *ID:* ${spawnId}\n⏰ *Expira en:* 10 minutos\n\n📝 *Activos:* ${global.psSpawns.filter(s => s.activo).length} PS disponibles`
    });

    // Mensaje de confirmación al owner
    await sock.sendMessage(from, {
        text: `✅ *Spawn creado exitosamente!*\n\n📛 *Personaje:* ${nombreConEfectos}\n💰 *Precio:* ${precioFinal.toLocaleString()} 🐼\n🆔 *ID:* ${spawnId}\n\n📊 *Total activos:* ${global.psSpawns.filter(s => s.activo).length} PS`
    });
}
