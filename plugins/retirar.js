import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';
import { trackRetirar } from '../middleware/trackAchievements.js';

export const command = 'retirar';
export const aliases = ['withdraw', 'with'];

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
            text: `💰 *RETIRAR INVERSIÓN* 💰\n\n📝 Uso: .retirar <cantidad/all> <moneda>\n\n🎯 *Monedas disponibles:*\n• LILANCOIN 🟡 (Estable)\n• DRAGONTOKEN 🔴 (Volátil)\n• UNISTAR 🔵 (Riesgo Alto)\n• MOONSHOT 🚀 (Extremo)\n• SAFEGEM 💎 (Balanceado)\n• NEUTRON ⚛️ (Tecnología)\n\n💡 *Ejemplos:*\n• .retirar 0.5 DRAGONTOKEN\n• .retirar all LILANCOIN\n• .retirar 2.0 UNISTAR\n\n📊 Usa .miinversion para ver tu portafolio`
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

    // Verificar si tiene inversión en esa moneda
    const inversion = user.inversiones[moneda];
    if (inversion.cantidad <= 0) {
        await sock.sendMessage(from, {
            text: `❌ No tienes inversión en ${precioInfo.nombre}.\n\n💼 Usa .miinversion para ver tu portafolio.`
        });
        return;
    }

    let cantidadMonedas;

    // Procesar cantidad
    if (cantidadInput === 'ALL') {
        cantidadMonedas = inversion.cantidad;
    } else {
        cantidadMonedas = parseFloat(cantidadInput);
        if (isNaN(cantidadMonedas) || cantidadMonedas <= 0) {
            await sock.sendMessage(from, {
                text: `❌ Cantidad inválida. Usa un número o "all".`
            });
            return;
        }
    }

    // Verificar que tenga suficientes monedas
    if (inversion.cantidad < cantidadMonedas) {
        await sock.sendMessage(from, {
            text: `❌ No tienes suficientes ${precioInfo.nombre}.\n\n💼 Tienes: ${inversion.cantidad.toFixed(4)}\n💸 Intentas retirar: ${cantidadMonedas.toFixed(4)}`
        });
        return;
    }

    // Calcular valor de retiro
    const valorRetiro = cantidadMonedas * precioInfo.precioActual;
    
    // Calcular la inversión original proporcional
    const proporcion = cantidadMonedas / inversion.cantidad;
    const inversionOriginal = inversion.inversionTotal * proporcion;
    const gananciaPerdida = valorRetiro - inversionOriginal;

    // Realizar retiro
    user.pandacoins += valorRetiro;
    inversion.cantidad -= cantidadMonedas;
    inversion.inversionTotal -= inversionOriginal;

    // Si no quedan monedas, limpiar el objeto
    if (inversion.cantidad <= 0) {
        inversion.cantidad = 0;
        inversion.inversionTotal = 0;
    }

    guardarDatabase(db);

    try { trackRetirar(sender, sock, from); } catch (e) {}

    const resultadoEmoji = gananciaPerdida >= 0 ? '📈' : '📉';
    const resultadoColor = gananciaPerdida >= 0 ? '🟢' : '🔴';
    const resultadoTexto = gananciaPerdida >= 0 ? 'GANANCIA' : 'PÉRDIDA';
    const porcentaje = inversionOriginal > 0 ? (gananciaPerdida / inversionOriginal) * 100 : 0;

    await sock.sendMessage(from, {
        text: `✅ *RETIRO EXITOSO!* ✅\n\n${precioInfo.color} *Moneda:* ${precioInfo.nombre}\n🪙 *Monedas retiradas:* ${cantidadMonedas.toFixed(4)}\n💰 *Valor recibido:* ${valorRetiro.toFixed(0).toLocaleString()} 🐼\n💸 *Inversión original:* ${inversionOriginal.toFixed(0).toLocaleString()} 🐼\n${resultadoEmoji} *${resultadoTexto}:* ${resultadoColor} ${gananciaPerdida >= 0 ? '+' : ''}${gananciaPerdida.toFixed(0).toLocaleString()} 🐼 (${porcentaje >= 0 ? '+' : ''}${porcentaje.toFixed(2)}%)\n\n💼 *Portafolio actual:*\n• ${precioInfo.nombre}: ${inversion.cantidad.toFixed(4)} monedas\n💰 *Saldo total:* ${user.pandacoins.toLocaleString()} 🐼\n\n📈 *Precio actual:* ${precioInfo.precioActual.toFixed(2)} 🐼`
    });
}
