import { consumirStock, cargarStock, guardarStock } from './addstock.js';
import { getSuerteMultiplicador } from '../lib/boostState.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { trackBuy, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatos, agregarPersonajeConEfectos } from '../lib/cacheManager.js';

export const command = 'buy2';
export const aliases = ['buyps', 'buypersonaje'];
export const category = 'economía';

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
    '🦆': 1.8,
    '🎄': 3,
    '🎅': 6,
    '❄️': 1.5,
    '🔥': 2,
    '🌟': 2.5,
    '⚡': 2.4,
    '🌙': 1.5,
    '☃️': 3,
    '🎁': 4.5,
    '🧦': 1.4,
    '🐉': 5,
    '👑': 3.5,
    '💎': 3.5,
    '🦄': 3,
    '⚓': 1.5,
    '🎯': 2,
    '🛡️': 2.5,
    '🗡️': 2,
    '🏆': 3.5,
    '🎨': 1.5,
    '🤢': 0.3
};

const probBase = {
    '🌈': 0.000011,
    '🚽': 0.000024,
    '👾': 0.00012,
    '🇨🇱': 0.00024,
    '☯️': 0.0012,
    '🌭': 0.0003,
    '🫓': 0.0003,
    '🍬': 0.0004,
    '🇧🇷': 0.0010,
    '🇨🇴': 0.0010,
    '🪳': 0.0004,
    '💀': 0.0005,
    '🌮': 0.005,
    '💧': 0.0018,
    '💤': 0.001,
    '💩': 0.0002,
    '🦆': 0.0006,
    '🎄': 0.00016,
    '🎅': 0.00001,
    '❄️': 0.0004,
    '🔥': 0.0002,
    '🌟': 0.00006,
    '⚡': 0.00018,
    '🌙': 0.0006,
    '☃️': 0.00008,
    '🎁': 0.00004,
    '🧦': 0.0016,
    '🐉': 0.000014,
    '👑': 0.00005,
    '💎': 0.00004,
    '🦄': 0.00014,
    '⚓': 0.0005,
    '🎯': 0.00024,
    '🛡️': 0.0002,
    '🗡️': 0.00030,
    '🏆': 0.00008,
    '🎨': 0.0006,
    '🤢': 0.0009
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

        const personajeConEfectos = {
            nombre: nombreFinal,
            calidad: personaje.calidad + ' con Efectos',
            precio: Math.floor(precioFinal),
            efectos: efectos,
            base: personaje.nombre,
            creadoEn: new Date().toISOString()
        };

        const fueAgregado = agregarPersonajeConEfectos(personajeConEfectos);

        if (fueAgregado) {
            console.log(`🎯 Nuevo personaje con efectos creado: ${nombreFinal}`);
        }

        return {
            nombreFinal,
            efectos,
            precioFinal: Math.floor(precioFinal),
            personajeConEfectos: fueAgregado ? personajeConEfectos : null,
            hasNegative: efectos.some(e => (multiplicadores[e] || 1) < 1)
        };
    }

    return {
        nombreFinal: personaje.nombre,
        efectos: [],
        precioFinal: personaje.precio,
        personajeConEfectos: null
    };
}



export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const db = cargarDatabase();
    
    db.users = db.users || {};
    let user = db.users[sender];
    
    if (!user) {
        await sock.sendMessage(from, { text: '❌ No estás registrado. Usa `.registrar` para empezar.' });
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
        await sock.sendMessage(from, { text: `⏳ Debes esperar *${restante}s* antes de volver a comprar.` });
        return;
    }

    user.pandacoins = user.pandacoins || 0;
    user.personajes = user.personajes || [];
    

    if (!user.inventario) {
        user.inventario = [];
    }

    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: '❌ Uso: `.buy <nombre>` o `.buy random`\n\n📝 Ejemplos:\n• `.buy Goku`\n• `.buy random`'
        });
        return;
    }

    const nombreInput = args.join(' ').toLowerCase();
    const suerte = getSuerteMultiplicador();

    const { personajes } = cargarDatos();


    if (nombreInput.includes('spooky lucky block') || nombreInput.includes('xmas lucky block')) {
        await sock.sendMessage(from, { text: '❌ Los Lucky Blocks ya no están disponibles.' });
        return;
    }

    if (nombreInput === 'random') {
        const personajesValidos = personajes.filter(p => !contieneEfectoProhibido(p.nombre));
        
        if (personajesValidos.length === 0) {
            await sock.sendMessage(from, { text: '❌ No hay personajes disponibles para compra random.' });
            return;
        }
        
        const personaje = personajesValidos[Math.floor(Math.random() * personajesValidos.length)];
        
        if (!consumirStock(personaje.nombre.toLowerCase())) {
            await sock.sendMessage(from, { text: `❌ El personaje *${personaje.nombre}* está agotado. Intenta de nuevo.` });
            return;
        }
        
        if (user.pandacoins < personaje.precio) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${personaje.precio.toLocaleString()}* 🐼 para comprar *${personaje.nombre}*.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` });
            return;
        }
        
        
        const resultado = aplicarEfectos(personaje, suerte);
        
        user.pandacoins -= personaje.precio;
        user.personajes.push(resultado.nombreFinal);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        
        let mensaje = `🎉 ¡Compraste a *${personaje.nombre}*!\n`;
        mensaje += `💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼\n`;
        
        if (resultado.efectos.length > 0) {
            const negativos = resultado.efectos.filter(e => (multiplicadores[e] || 1) < 1);
            if (negativos.length > 0) {
                mensaje += `\n⚠️ *Efectos negativos aplicados!*\n`;
                mensaje += `🎁 Efectos: ${resultado.efectos.join(' ')}\n`;
                mensaje += `📉 Valor reducido: *${personaje.precio.toLocaleString()}* → *${resultado.precioFinal.toLocaleString()}* 🐼`;
            } else {
                mensaje += `\n✨ ¡Obtuvo efectos especiales!\n`;
                mensaje += `🎁 Efectos: ${resultado.efectos.join(' ')}\n`;
                mensaje += `📈 Valor multiplicado: *${personaje.precio.toLocaleString()}* → *${resultado.precioFinal.toLocaleString()}* 🐼`;
            }

            if (resultado.personajeConEfectos) {
                mensaje += `\n\n🆕 *Nuevo personaje creado!* Ahora puedes vender *${resultado.nombreFinal}* usando .sell`;
            }

            const tieneRainbow = resultado.efectos.includes('🌈');
            const tieneToilet = resultado.efectos.includes('🚽');
            if (tieneRainbow || tieneToilet) {
                console.log(`🎯 Efecto especial obtenido: ${resultado.efectos.join(', ')}`);
            }
        }

        await sock.sendMessage(from, { text: mensaje });
        
        if (suerte > 1) {
            await sock.sendMessage(from, { react: { text: '🍀', key: msg.key } });
        }
        
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        return;
    }

    const personaje = personajes.find(p => p.nombre.toLowerCase() === nombreInput);


    if (personaje) {
        if (contieneEfectoProhibido(personaje.nombre)) {
            await sock.sendMessage(from, { text: '❌ No puedes comprar personajes que ya tienen efectos.' });
            return;
        }
        
        if (!consumirStock(personaje.nombre.toLowerCase())) {
            await sock.sendMessage(from, { text: `❌ El personaje *${personaje.nombre}* está agotado.` });
            return;
        }
        
        if (user.pandacoins < personaje.precio) {
            await sock.sendMessage(from, { text: `❌ Necesitas *${personaje.precio.toLocaleString()}* 🐼 para comprar *${personaje.nombre}*.\nTienes: *${user.pandacoins.toLocaleString()}* 🐼` });
            return;
        }
        

        const resultado = aplicarEfectos(personaje, suerte);
        
        user.pandacoins -= personaje.precio;
        user.personajes.push(resultado.nombreFinal);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        
        let mensaje = `🎉 ¡Compraste a *${personaje.nombre}*!\n`;
        mensaje += `💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼\n`;
        
        if (resultado.efectos.length > 0) {
            const negativos = resultado.efectos.filter(e => (multiplicadores[e] || 1) < 1);
            if (negativos.length > 0) {
                mensaje += `\n⚠️ *Efectos negativos aplicados!*\n`;
                mensaje += `🎁 Efectos: ${resultado.efectos.join(' ')}\n`;
                mensaje += `📉 Valor reducido: *${personaje.precio.toLocaleString()}* → *${resultado.precioFinal.toLocaleString()}* 🐼`;
            } else {
                await sock.sendMessage(from, { text: `❌ No se encontró *"${args.join(' ')}"*.

        📝 Usa \.viewps para ver personajes disponibles.` });
            }
        }
        
        user.pandacoins -= item.precio;
        

        if (!user.inventario) {
            user.inventario = [];
        }
        
        user.inventario.push(item.nombre);
        user.ultimoBuy = ahora;
        guardarDatabase(db);
        
        await sock.sendMessage(from, { text: `✅ Compraste *${item.nombre}* por *${item.precio.toLocaleString()}* 🐼\n💰 Te quedan: *${user.pandacoins.toLocaleString()}* 🐼` });
        
        trackBuy(sender, sock, from);
        checkSpecialAchievements(sender, sock, from);
        
    } else {
        await sock.sendMessage(from, { text: `❌ No se encontró *"${args.join(' ')}"*.\n\n📝 Usa \`.viewps\` para ver personajes disponibles.` });
    }
}