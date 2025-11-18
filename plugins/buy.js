import { consumirStock, cargarStock, guardarStock } from './addstock.js';
import { getSuerteMultiplicador } from '../lib/boostState.js';
import fs from 'fs';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { trackBuy, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';

export const command = 'buy';
export const aliases = ['comprar', 'b'];
export const description = 'Compra personajes, ítems o lucky blocks';
export const category = 'economía';

let personajesCache = null;
let itemsCache = null;
let lastLoadTime = 0;

function cargarDatos() {
    const now = Date.now();
    if (!personajesCache || !itemsCache || now - lastLoadTime > 300000) {
        const personajesData = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
        const itemsData = JSON.parse(fs.readFileSync('./data/items.json', 'utf8'));
        personajesCache = personajesData.characters;
        itemsCache = itemsData.items;
        lastLoadTime = now;
    }
    return { personajes: personajesCache, items: itemsCache };
}

export const multiplicadores = {
    '🌈': 8,
    '🚽': 14,
    '👾': 5,
    '🇨🇱': 3,
    '☯️': 2.5,
    '🌭': 2,
    '🍬': 2,
    '🇧🇷': 2,
    '🇨🇴': 2,
    '🪳': 2,
    '💀': 1.5,
    '🌮': 1.5,
    '🫓': 1.5,
    '💧': 1.1,
    '💤': 0.5,
    '💩': 0.1,
    '🦆': 1.8
};

const probBase = {
    '🌈': 0.00012,
    '🚽': 0.00001,
    '👾': 0.0006,
    '🇨🇱': 0.0012,
    '☯️': 0.005,
    '🌭': 0.0015,
    '🫓': 0.0015,
    '🍬': 0.002,
    '🇧🇷': 0.005,
    '🇨🇴': 0.005,
    '🪳': 0.002,
    '💀': 0.0025,
    '🌮': 0.0075,
    '💧': 0.009,
    '💤': 0.05,
    '💩': 0.001,
    '🦆': 0.003
};

function contieneEfectoProhibido(nombrePersonaje) {
    const efectosProhibidos = Object.keys(multiplicadores);
    return efectosProhibidos.some(emoji => nombrePersonaje.includes(emoji));
}

function calcularProbabilidades(suerte) {
    const probEfectos = {};
    for (const efecto in probBase) {
        probEfectos[efecto] = probBase[efecto] * suerte;
    }
    return probEfectos;
}

function aplicarEfectos(personaje, suerte) {
    const efectos = [];
    let precioFinal = personaje.precio;
    const probEfectos = calcularProbabilidades(suerte);

    for (const efecto in probEfectos) {
        if (Math.random() < probEfectos[efecto]) {
            efectos.push(efecto);
            precioFinal *= multiplicadores[efecto];
        }
    }

    if (efectos.length > 0) {
        const nombreFinal = `${personaje.nombre} ${efectos.join(' ')}`;
        return {
            nombreFinal,
            efectos,
            precioFinal: Math.floor(precioFinal)
        };
    }

    return {
        nombreFinal: personaje.nombre,
        efectos: [],
        precioFinal: personaje.precio
    };
}

async function mostrarAnimacionCompra(sock, from, nombrePersonaje) {
    const frames = ['🛒', '💳', '✨', '🎁', '🎉'];
    let i = 0;
    const m = await sock.sendMessage(from, { text: `⏳ Comprando a *${nombrePersonaje}*...` });
    const intervalo = setInterval(async () => {
        const texto = `${frames[i]} Comprando a *${nombrePersonaje}*...`;
        i = (i + 1) % frames.length;
        try {
            await sock.sendMessage(from, { edit: m.key, text: texto });
        } catch (e) {
            clearInterval(intervalo);
        }
    }, 400);
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(intervalo);
    return m.key;
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender];

    if (!user) {
        await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar` para empezar.' }, { quoted: msg });
        return;
    }

    if (!user.achievements) {
        initializeAchievements(sender);
    }

    const COOLDOWN_MS = 3 * 1000;
    const ahora = Date.now();
    const ultimoBuy = user.ultimoBuy || 0;
    if (ahora - ultimoBuy < COOLDOWN_MS) {
        const restante = Math.ceil((COOLDOWN_MS - (ahora - ultimoBuy)) / 1000);
        await sock.sendMessage(from, { text: `⏳ Debes esperar *${restante}s* antes de volver a comprar.` }, { quoted: msg });
        return;
    }

    user.pandacoins = user.pandacoins || 0;
    user.personajes = user.personajes || [];
    user.inventario = user.inventario || [];

    if (args.length === 0) {
        await sock.sendMessage(from, { text: '❌ Uso: `.buy <nombre>` o `.buy random`\n\n📝 Ejemplos:\n• `.buy Goku`\n• `.buy random`\n• `.buy Spooky Lucky Block`' }, { quoted: msg });
        return;
    }

    const nombreInput = args.join(' ').toLowerCase();
    const suerte = getSuerteMultiplicador();
    const { personajes, items } = cargarDatos();

    if (nombreInput === 'spooky lucky block') {
        const price = 250000000;
        if (!consumirStock('spooky lucky block')) {
            await sock.sendMessage(from, { text: `❌ El 🎃 *Spooky Lucky Block* está agotado.` }, { quoted: msg });
            return;
        }
        if (user.pandacoins < price) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${price.toLocaleString()}* 🐼 pandacoins.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
            return;
        }
        user.pandacoins -= price;
        user.inventario.push("Spooky Lucky Block");
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        const frames = ['🎃','👻','🕸','💀','🕷'];
        let i = 0;
        const m = await sock.sendMessage(from, { text: `🛒 Comprando 🎃 Spooky Lucky Block...` });
        const intervalo = setInterval(async () => {
            const texto = `🛒 Comprando Spooky Lucky Block... ${frames[i]}`;
            i = (i + 1) % frames.length;
            try {
                await sock.sendMessage(from, { edit: m.key, text: texto });
            } catch (e) {
                clearInterval(intervalo);
            }
        }, 350);
        setTimeout(async () => {
            clearInterval(intervalo);
            await sock.sendMessage(from, { edit: m.key, text: `✅ ¡Compraste un 🎃 *Spooky Lucky Block*!\n\n🎁 Usa \`.open Spooky Lucky Block\` para abrirlo.` });
        }, 3500);
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        return;
    }

    if (nombreInput === 'random') {
        const personajesValidos = personajes.filter(p => !contieneEfectoProhibido(p.nombre));
        if (personajesValidos.length === 0) {
            await sock.sendMessage(from, { text: '❌ No hay personajes disponibles para compra random.' }, { quoted: msg });
            return;
        }
        const personaje = personajesValidos[Math.floor(Math.random() * personajesValidos.length)];
        if (!consumirStock(personaje.nombre.toLowerCase())) {
            await sock.sendMessage(from, { text: `❌ El personaje *${personaje.nombre}* está agotado. Intenta de nuevo.` }, { quoted: msg });
            return;
        }
        if (user.pandacoins < personaje.precio) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${personaje.precio.toLocaleString()}* 🐼 para comprar *${personaje.nombre}*.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
            return;
        }
        const animKey = await mostrarAnimacionCompra(sock, from, personaje.nombre);
        const resultado = aplicarEfectos(personaje, suerte);
        user.pandacoins -= personaje.precio;
        user.personajes.push(resultado.nombreFinal);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        let mensaje = `🎉 ¡Compraste a *${personaje.nombre}*!\n`;
        mensaje += `💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼\n`;
        if (resultado.efectos.length > 0) {
            mensaje += `\n✨ ¡Obtuvo efectos especiales!\n`;
            mensaje += `🎁 Efectos: ${resultado.efectos.join(' ')}\n`;
            mensaje += `📈 Valor multiplicado: *${personaje.precio.toLocaleString()}* → *${resultado.precioFinal.toLocaleString()}* 🐼`;
            const tieneRainbow = resultado.efectos.includes('🌈');
            const tieneToilet = resultado.efectos.includes('🚽');
            if (tieneRainbow || tieneToilet) {
                console.log(`🎯 Efecto especial obtenido: ${resultado.efectos.join(', ')}`);
            }
        }
        await sock.sendMessage(from, { edit: animKey, text: mensaje });
        if (suerte > 1) {
            await sock.sendMessage(from, { react: { text: '🍀', key: msg.key } });
        }
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        return;
    }

    const personaje = personajes.find(p => p.nombre.toLowerCase() === nombreInput);
    const item = items.find(i => i.nombre.toLowerCase() === nombreInput);

    if (personaje) {
        if (contieneEfectoProhibido(personaje.nombre)) {
            await sock.sendMessage(from, { text: '❌ No puedes comprar personajes que ya tienen efectos.' }, { quoted: msg });
            return;
        }
        if (!consumirStock(personaje.nombre.toLowerCase())) {
            await sock.sendMessage(from, { text: `❌ El personaje *${personaje.nombre}* está agotado.` }, { quoted: msg });
            return;
        }
        if (user.pandacoins < personaje.precio) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${personaje.precio.toLocaleString()}* 🐼 para comprar *${personaje.nombre}*.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
            return;
        }
        const animKey = await mostrarAnimacionCompra(sock, from, personaje.nombre);
        const resultado = aplicarEfectos(personaje, suerte);
        user.pandacoins -= personaje.precio;
        user.personajes.push(resultado.nombreFinal);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        let mensaje = `🎉 ¡Compraste a *${personaje.nombre}*!\n`;
        mensaje += `💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼\n`;
        if (resultado.efectos.length > 0) {
            mensaje += `\n✨ ¡Obtuvo efectos especiales!\n`;
            mensaje += `🎁 Efectos: ${resultado.efectos.join(' ')}\n`;
            mensaje += `📈 Valor multiplicado: *${personaje.precio.toLocaleString()}* → *${resultado.precioFinal.toLocaleString()}* 🐼`;
            const tieneRainbow = resultado.efectos.includes('🌈');
            const tieneToilet = resultado.efectos.includes('🚽');
            if (tieneRainbow || tieneToilet) {
                console.log(`🎯 Efecto especial obtenido: ${resultado.efectos.join(', ')}`);
            }
        }
        await sock.sendMessage(from, { edit: animKey, text: mensaje });
        if (suerte > 1) {
            await sock.sendMessage(from, { react: { text: '🍀', key: msg.key } });
        }
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
    } else if (item) {
        if (user.pandacoins < item.precio) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${item.precio.toLocaleString()}* 🐼 para comprar *${item.nombre}*.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
            return;
        }
        user.pandacoins -= item.precio;
        user.inventario.push(item.nombre);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        await sock.sendMessage(from, { text: `✅ Compraste *${item.nombre}* por *${item.precio.toLocaleString()}* 🐼\n💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
    } else {
        await sock.sendMessage(from, { text: `❌ No se encontró *"${args.join(' ')}"*.\n\n📝 Usa \`.viewps\` para ver personajes disponibles.` }, { quoted: msg });
    }
}
