import { consumirStock, cargarStock, guardarStock } from './addstock.js';
import { getSuerteMultiplicador } from '../lib/boostState.js';
import fs from 'fs';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { trackBuy, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatos, agregarPersonajeConEfectos } from '../lib/cacheManager.js';

export const command = 'buy';
export const aliases = ['comprar', 'b'];
export const description = 'Compra personajes, ítems o lucky blocks';
export const category = 'economía';

export const multiplicadores = {
    '🌈': 8,      // Rainbow (Legendario)
    '🚽': 14,     // Toilet (Mítico)
    '👾': 5,      // Alien (Épico)
    '🇨🇱': 3,     // Chile (Raro)
    '☯️': 2.5,    // Yin Yang
    '🌭': 2,      // Hot Dog
    '🍬': 2,      // Candy
    '🇧🇷': 2,     // Brasil
    '🇨🇴': 2,     // Colombia
    '🪳': 2,      // Cucaracha
    '💀': 1.5,    // Calavera
    '🌮': 1.5,    // Taco
    '🫓': 1.5,    // Pan
    '💧': 1.1,    // Gota
    '💤': 0.5,    // Sueño (nerf)
    '💩': 0.1,    // Caca (maldición)
    '🦆': 1.8,    // Pato
    '🎄': 6,      // Árbol Navideño (Épico)
    '🎅': 12,     // Santa Claus (Mítico)
    '❄️': 3,      // Nieve (Raro)
    '🔥': 4,      // Fuego (Épico)
    '🌟': 7,      // Estrella Brillante (Legendario)
    '⚡': 5,      // Rayo (Épico)
    '🌙': 3,      // Luna (Raro)
    '☃️': 8,      // Muñeco de Nieve (Legendario)
    '🎁': 9,      // Regalo (Legendario)
    '🧦': 2,      // Calcetín Navideño (Común)
    '🐉': 10,     // Dragón (Mítico)
    '👑': 8,      // Corona (Legendario)
    '💎': 9,      // Diamante (Legendario)
    '🦄': 6,      // Unicornio (Épico)
    '⚓': 3,      // Ancla (Raro)
    '🎯': 4,      // Diana (Épico)
    '🛡️': 5,      // Escudo (Épico)
    '🗡️': 4,      // Espada (Épico)
    '🏆': 7,      // Trofeo (Legendario)
    '🎨': 3       // Paleta de Arte (Raro)
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
    '🦆': 0.003,
    '🎄': 0.0008,
    '🎅': 0.00005,
    '❄️': 0.002,
    '🔥': 0.001,
    '🌟': 0.0003,
    '⚡': 0.0009,
    '🌙': 0.003,
    '☃️': 0.0004,
    '🎁': 0.0002,
    '🧦': 0.008,
    '🐉': 0.00007,
    '👑': 0.00025,
    '💎': 0.0002,
    '🦄': 0.0007,
    '⚓': 0.0025,
    '🎯': 0.0012,
    '🛡️': 0.001,
    '🗡️': 0.0015,
    '🏆': 0.0004,
    '🎨': 0.003
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
        
        // 🔥 CREAR NUEVO PERSONAJE CON EFECTOS Y AGREGARLO AL SISTEMA
        const personajeConEfectos = {
            nombre: nombreFinal,
            calidad: personaje.calidad + ' con Efectos',
            precio: Math.floor(precioFinal),
            efectos: efectos,
            base: personaje.nombre,
            creadoEn: new Date().toISOString()
        };
        
        // Agregar a la caché y al archivo inmediatamente
        const fueAgregado = agregarPersonajeConEfectos(personajeConEfectos);
        
        if (fueAgregado) {
            console.log(`🎯 Nuevo personaje con efectos creado: ${nombreFinal}`);
        }
        
        return {
            nombreFinal,
            efectos,
            precioFinal: Math.floor(precioFinal),
            personajeConEfectos: fueAgregado ? personajeConEfectos : null
        };
    }

    return {
        nombreFinal: personaje.nombre,
        efectos: [],
        precioFinal: personaje.precio,
        personajeConEfectos: null
    };
}

async function mostrarAnimacionCompra(sock, from, nombrePersonaje) {
    const frames = ['✨', '🎁', '🎉'];
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
        await sock.sendMessage(from, {
            text: '❌ Uso: `.buy <nombre>` o `.buy random`\n\n📝 Ejemplos:\n• `.buy Goku`\n• `.buy random`\n• `.buy Spooky Lucky Block`\n• `.buy Xmas Lucky Block`'
        }, { quoted: msg });
        return;
    }

    const nombreInput = args.join(' ').toLowerCase();
    const suerte = getSuerteMultiplicador();
    
    // 🔥 USAR CACHÉ EN LUGAR DE CARGAR DIRECTAMENTE
    const { personajes, items } = cargarDatos();

    // CASO 1: SPOOKY LUCKY BLOCK
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
            await sock.sendMessage(from, {
                edit: m.key,
                text: `✅ ¡Compraste un 🎃 *Spooky Lucky Block*!\n\n🎁 Usa \`.open Spooky Lucky Block\` para abrirlo.`
            });
        }, 3500);
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        return;
    }

    // CASO 2: XMAS LUCKY BLOCK (NUEVO)
    if (nombreInput === 'xmas lucky block') {
        const price = 300000000; // Un poco más caro que el Spooky
        if (!consumirStock('xmas lucky block')) {
            await sock.sendMessage(from, { text: `❌ El 🎄 *Xmas Lucky Block* está agotado.` }, { quoted: msg });
            return;
        }
        if (user.pandacoins < price) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${price.toLocaleString()}* 🐼 pandacoins.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` }, { quoted: msg });
            return;
        }
        user.pandacoins -= price;
        user.inventario.push("Xmas Lucky Block");
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        const frames = ['🎄','🎅','❄️','☃️','🌟'];
        let i = 0;
        const m = await sock.sendMessage(from, { text: `🛒 Comprando 🎄 Xmas Lucky Block...` });
        const intervalo = setInterval(async () => {
            const texto = `🛒 Comprando Xmas Lucky Block... ${frames[i]}`;
            i = (i + 1) % frames.length;
            try {
                await sock.sendMessage(from, { edit: m.key, text: texto });
            } catch (e) {
                clearInterval(intervalo);
            }
        }, 350);
        setTimeout(async () => {
            clearInterval(intervalo);
            await sock.sendMessage(from, {
                edit: m.key,
                text: `✅ ¡Compraste un 🎄 *Xmas Lucky Block*!\n\n🎁 Usa \`.open Xmas Lucky Block\` para abrirlo.`
            });
        }, 3500);
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        return;
    }

    // CASO 3: COMPRA RANDOM
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
            
            // 🔥 MENSAJE ESPECIAL SI SE CREÓ NUEVO PERSONAJE
            if (resultado.personajeConEfectos) {
                mensaje += `\n\n🆕 *Nuevo personaje creado!* Ahora puedes vender *${resultado.nombreFinal}* usando .sell`;
            }
            
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

    // CASO 4: COMPRA ESPECÍFICA
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
            
            // 🔥 MENSAJE ESPECIAL SI SE CREÓ NUEVO PERSONAJE
            if (resultado.personajeConEfectos) {
                mensaje += `\n\n🆕 *Nuevo personaje creado!* Ahora puedes vender *${resultado.nombreFinal}* usando .sell`;
            }
            
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
