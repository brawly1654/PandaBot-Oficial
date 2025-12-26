import fs from 'fs';
import { cargarDatabase, guardarDatabase, addPandacoins } from '../data/database.js';
import { cargarDatos } from '../lib/cacheManager.js'; // Nueva importación

export const command = 'sell2';

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

    const COOLDOWN_MS = 0 * 60 * 1000;
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

    if (!args.length) {
        await sock.sendMessage(from, { text: '❌ Usa .sell2 <NombrePersonaje> para vender un personaje.' });
        return;
    }

    const nombre = args.join(' ').trim();
    const nombreLower = nombre.toLowerCase();
    
    // 🔥 USAR CACHÉ EN LUGAR DE CARGAR DIRECTAMENTE DEL ARCHIVO
    const { personajes } = cargarDatos();
    const personaje = personajes.find(p => p.nombre.toLowerCase() === nombreLower);

    if (!personaje) {
        await sock.sendMessage(from, { text: `❌ Personaje no encontrado. Usa .misps para ver tus personajes.` });
        return;
    }

    if (personaje.nombre.toLowerCase().includes("lucky block")) {
        await sock.sendMessage(from, { text: `🎃 ❌ No puedes vender Lucky Blocks.` });
        return;
    }

    user.personajes = user.personajes || [];

    const cantidadInventario = user.personajes.filter(p => p === personaje.nombre).length;
    if (cantidadInventario === 0) {
        await sock.sendMessage(from, { text: `❌ No tienes a *${personaje.nombre}* en tu colección.` });
        return;
    }

    const alineados = Object.values(user.alineacion?.posiciones || {}).filter(p => p === personaje.nombre).length;
    if (alineados > 0) {
        await sock.sendMessage(from, {
            text: `⚽️ No puedes vender a *${personaje.nombre}* porque está alineado en tu equipo de fútbol (${alineados} posición(es)). Usa *.remover <posición>* primero.`
        });
        return;
    }

    const index = user.personajes.indexOf(personaje.nombre);
    if (index !== -1) user.personajes.splice(index, 1);

    user.ultimoSell = ahora;

    // Usar helper centralizado para repartir con pareja si aplica
    let payout = addPandacoins(db, sender, personaje.precio);
    if (!payout) {
        db.users[sender].pandacoins = (db.users[sender].pandacoins || 0) + personaje.precio;
        payout = { userGain: personaje.precio, spouse: null, spouseShare: 0 };
    }

    if (db.clanes) {
        const clanName = Object.keys(db.clanes).find(nombre =>
            db.clanes[nombre].miembros.includes(sender)
        );
        if (clanName) {
            db.clanes[clanName].recolectados = (db.clanes[clanName].recolectados || 0) + personaje.precio;
        }
    }

    guardarDatabase(db);

    const text = payout.spouseShare > 0 && payout.spouse
        ? `✅ Has vendido a *${personaje.nombre}* por ${payout.userGain.toLocaleString()} pandacoins. (${payout.spouseShare.toLocaleString()} para tu pareja)`
        : `✅ Has vendido a *${personaje.nombre}* por ${payout.userGain.toLocaleString()} pandacoins.`;

    await sock.sendMessage(from, { text });
}
