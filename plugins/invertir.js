import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';

export const command = 'invertir';
export const aliases = ['invest'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] = db.users[sender] || {};
    
    // Inicializar datos de inversión
    user.pandacoins = user.pandacoins || 0;
    user.inversiones = user.inversiones || {
        LILANCOIN: { cantidad: 0, inversionTotal: 0 },
        DRAGONTOKEN: { cantidad: 0, inversionTotal: 0 },
        UNISTAR: { cantidad: 0, inversionTotal: 0 }
    };

    if (args.length < 2) {
        await sock.sendMessage(from, {
            text: `💰 *SISTEMA DE INVERSIÓN* 💰\n\n📝 Uso: .invertir <cantidad> <moneda>\n\n🎯 Monedas disponibles:\n• LILANCOIN 🟡 (Estable)\n• DRAGONTOKEN 🔴 (Volátil)  \n• UNISTAR 🔵 (Riesgo Alto)\n\n💡 Ejemplos:\n• .invertir 10000 LILANCOIN\n• .invertir 5000 DRAGONTOKEN\n• .invertir all UNISTAR\n\n📊 Usa .mercado para ver precios actuales`
        });
        return;
    }

    const cantidadInput = args[0].toUpperCase();
    const moneda = args[1].toUpperCase();

    // Actualizar precios del mercado
    await actualizarMercado();

    // Obtener precio actual
    const precioInfo = await obtenerPrecioMoneda(moneda);
    if (!precioInfo) {
        await sock.sendMessage(from, {
            text: `❌ Moneda no encontrada. Monedas válidas: PANDACOIN, DRAGONTOKEN, UNISTAR`
        });
        return;
    }

    let cantidadPandacoins;

    // Procesar cantidad (puede ser número o "all")
    if (cantidadInput === 'ALL') {
        if (user.pandacoins <= 0) {
            await sock.sendMessage(from, {
                text: `❌ No tienes pandacoins para invertir.`
            });
            return;
        }
        cantidadPandacoins = user.pandacoins;
    } else {
        cantidadPandacoins = parseInt(cantidadInput);
        if (isNaN(cantidadPandacoins) || cantidadPandacoins <= 0) {
            await sock.sendMessage(from, {
                text: `❌ Cantidad inválida. Usa un número o "all".`
            });
            return;
        }
    }

    // Verificar fondos
    if (user.pandacoins < cantidadPandacoins) {
        await sock.sendMessage(from, {
            text: `❌ Fondos insuficientes.\n\n💰 Tienes: ${user.pandacoins.toLocaleString()} 🐼\n💸 Intentas invertir: ${cantidadPandacoins.toLocaleString()} 🐼`
        });
        return;
    }

    // Calcular cantidad de monedas a comprar
    const cantidadMonedas = cantidadPandacoins / precioInfo.precioActual;

    // Realizar inversión
    user.pandacoins -= cantidadPandacoins;
    user.inversiones[moneda].cantidad += cantidadMonedas;
    user.inversiones[moneda].inversionTotal += cantidadPandacoins;

    guardarDatabase(db);

    await sock.sendMessage(from, {
        text: `✅ *INVERSIÓN EXITOSA!* ✅\n\n${precioInfo.color} *Moneda:* ${precioInfo.nombre}\n💰 *Invertido:* ${cantidadPandacoins.toLocaleString()} 🐼\n🪙 *Monedas compradas:* ${cantidadMonedas.toFixed(4)}\n📈 *Precio unitario:* ${precioInfo.precioActual.toFixed(2)} 🐼\n\n💼 *Portafolio actual:*\n• ${precioInfo.nombre}: ${user.inversiones[moneda].cantidad.toFixed(4)} monedas\n💰 *Saldo restante:* ${user.pandacoins.toLocaleString()} 🐼`
    });
}
