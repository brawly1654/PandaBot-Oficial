import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { cargarDatos } from '../lib/cacheManager.js'; // Usar caché centralizada

export const command = 'sellall';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender];

    if (!user) {
        await sock.sendMessage(from, { text: '❌ No estás registrado. Usa .registrar para empezar.' });
        return;
    }

    const COOLDOWN_MS = 0 * 60 * 1000; // ajusta si quieres cooldown
    const ahora = Date.now();
    const ultimoSell = user.ultimoSell || 0;

    if (ahora - ultimoSell < COOLDOWN_MS) {
        const restante = COOLDOWN_MS - (ahora - ultimoSell);
        const minutos = Math.floor(restante / 60000);
        const segundos = Math.floor((restante % 60000) / 1000);
        await sock.sendMessage(from, {
            text: `⏳ Debes esperar *${minutos}m ${segundos}s* antes de volver a vender.`,
        }, { quoted: msg });
        return;
    }

    user.personajes = user.personajes || [];
    if (user.personajes.length === 0) {
        await sock.sendMessage(from, { text: '❌ No tienes personajes para vender.' }, { quoted: msg });
        return;
    }

    // 🔥 USAR CACHÉ EN LUGAR DE CARGAR DIRECTAMENTE DEL ARCHIVO
    const { personajes } = cargarDatos();

    let vendidos = 0;
    let gananciaTotal = 0;
    const noVendidos = [];

    // recorrer todos los personajes del usuario
    for (const nombre of [...user.personajes]) {
        const personaje = personajes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (!personaje) continue;

        // no vender lucky blocks
        if (personaje.nombre.toLowerCase().includes("lucky block")) {
            noVendidos.push(personaje.nombre);
            continue;
        }

        // no vender si está alineado
        const alineados = Object.values(user.alineacion?.posiciones || {}).filter(p => p === personaje.nombre).length;
        if (alineados > 0) {
            noVendidos.push(personaje.nombre);
            continue;
        }

        // vender personaje
        const index = user.personajes.indexOf(personaje.nombre);
        if (index !== -1) user.personajes.splice(index, 1);

        user.pandacoins = user.pandacoins || 0;
        user.pandacoins += personaje.precio;
        gananciaTotal += personaje.precio;
        vendidos++;
    }

    user.ultimoSell = ahora;

    // actualizar clan si corresponde
    if (db.clanes) {
        const clanName = Object.keys(db.clanes).find(nombre =>
            db.clanes[nombre].miembros.includes(sender)
        );
        if (clanName) {
            db.clanes[clanName].recolectados = (db.clanes[clanName].recolectados || 0) + gananciaTotal;
        }
    }

    guardarDatabase(db);

    let texto = `✅ Has vendido *${vendidos}* personajes por un total de *${gananciaTotal.toLocaleString()}* pandacoins.`;
    
    if (noVendidos.length > 0) {
        texto += `\n\n⚠️ No se vendieron *${noVendidos.length}* personajes:\n`;
        
        // Agrupar por razón
        const luckyBlocks = noVendidos.filter(n => n.toLowerCase().includes("lucky block"));
        const alineados = noVendidos.filter(n => !n.toLowerCase().includes("lucky block"));
        
        if (luckyBlocks.length > 0) {
            texto += `\n🎯 *Lucky Blocks (no vendibles):*\n- ${luckyBlocks.slice(0, 3).join('\n- ')}`;
            if (luckyBlocks.length > 3) texto += `\n... y ${luckyBlocks.length - 3} más`;
        }
        
        if (alineados.length > 0) {
            texto += `\n\n⚽ *Alineados en equipo:*\n- ${alineados.slice(0, 3).join('\n- ')}`;
            if (alineados.length > 3) texto += `\n... y ${alineados.length - 3} más`;
        }
    }

    texto += `\n\n💰 *Saldo actual:* ${user.pandacoins.toLocaleString()} 🐼`;

    await sock.sendMessage(from, { text: texto }, { quoted: msg });
}
