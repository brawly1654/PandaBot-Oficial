import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';
import { trackInvertir } from '../middleware/trackAchievements.js';
import { trackProgress } from '../data/achievementsDB.js';

export const command = 'invertir';
export const aliases = ['invest'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] = db.users[sender] || {};

    // Inicializar datos de inversión con TODAS las monedas
    user.pandacoins = user.pandacoins || 0;
    
    // 🔥 INICIALIZAR CORRECTAMENTE EL OBJETO DE INVERSIONES
    if (!user.inversiones) {
        user.inversiones = {};
    }
    
    // Asegurar que todas las monedas existan en el objeto
    const todasLasMonedas = ['LILANCOIN', 'DRAGONTOKEN', 'UNISTAR', 'MOONSHOT', 'SAFEGEM', 'NEUTRON'];
    todasLasMonedas.forEach(moneda => {
        if (!user.inversiones[moneda]) {
            user.inversiones[moneda] = { cantidad: 0, inversionTotal: 0 };
        }
    });

    if (args.length < 2) {
        await sock.sendMessage(from, {
            text: `💰 *SISTEMA DE INVERSIÓN* 💰\n\n📝 Uso: .invertir <cantidad> <moneda>\n\n🎯 *Monedas disponibles:*\n• LILANCOIN 🟡 (2% volatilidad) - Estable\n• DRAGONTOKEN 🔴 (8% volatilidad) - Volátil\n• UNISTAR 🔵 (12% volatilidad) - Riesgo Alto\n• MOONSHOT 🚀 (25% volatilidad) - Extremo\n• SAFEGEM 💎 (5% volatilidad) - Balanceado\n• NEUTRON ⚛️ (15% volatilidad) - Tecnología\n\n💡 *Ejemplos:*\n• .invertir 10000 LILANCOIN\n• .invertir 5000 DRAGONTOKEN\n• .invertir all MOONSHOT\n\n📊 Usa .mercado para ver precios actuales`
        });
        return;
    }

    const cantidadInput = args[0].toUpperCase();
    const moneda = args[1].toUpperCase();

    // Validar moneda
    const monedasValidas = ['LILANCOIN', 'DRAGONTOKEN', 'UNISTAR', 'MOONSHOT', 'SAFEGEM', 'NEUTRON'];
    if (!monedasValidas.includes(moneda)) {
        await sock.sendMessage(from, {
            text: `❌ Moneda no válida. Monedas disponibles:\n${monedasValidas.map(m => `• ${m}`).join('\n')}`
        });
        return;
    }

    // 🔥 VERIFICAR QUE LA MONEDA EXISTE EN INVERSIONES
    if (!user.inversiones[moneda]) {
        user.inversiones[moneda] = { cantidad: 0, inversionTotal: 0 };
    }

    // Actualizar precios del mercado
    await actualizarMercado();

    // Obtener precio actual
    const precioInfo = await obtenerPrecioMoneda(moneda);
    if (!precioInfo) {
        await sock.sendMessage(from, {
            text: `❌ Error al obtener precio de ${moneda}. Intenta nuevamente.`
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

    // 🔥 ACCEDER CORRECTAMENTE A LA MONEDA
    const inversion = user.inversiones[moneda];
    
    // Realizar inversión
    user.pandacoins -= cantidadPandacoins;
    inversion.cantidad += cantidadMonedas;
    inversion.inversionTotal += cantidadPandacoins;

    guardarDatabase(db);

    try { trackInvertir(sender, sock, from); } catch (e) {}
    try { trackProgress(sender, 'inversion_amount', cantidadPandacoins, sock, from); } catch (e) {}

    await sock.sendMessage(from, {
        text: `✅ *INVERSIÓN EXITOSA!* ✅\n\n${precioInfo.color} *Moneda:* ${precioInfo.nombre}\n💰 *Invertido:* ${cantidadPandacoins.toLocaleString()} 🐼\n🪙 *Monedas compradas:* ${cantidadMonedas.toFixed(4)}\n📈 *Precio unitario:* ${precioInfo.precioActual.toFixed(2)} 🐼\n\n💼 *Portafolio actual:*\n• ${precioInfo.nombre}: ${inversion.cantidad.toFixed(4)} monedas\n💰 *Saldo restante:* ${user.pandacoins.toLocaleString()} 🐼\n\n⚠️ *Recuerda:* Los precios cambian cada 5 minutos`
    });
}
