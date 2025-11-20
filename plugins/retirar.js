import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';

export const command = 'retirar';
export const aliases = ['withdraw'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] = db.users[sender] || {};
    
    user.inversiones = user.inversiones || {
        PANDACOIN: { cantidad: 0, inversionTotal: 0 },
        DRAGONTOKEN: { cantidad: 0, inversionTotal: 0 },
        UNISTAR: { cantidad: 0, inversionTotal: 0 }
    };

    if (args.length < 2) {
        await sock.sendMessage(from, {
            text: `💰 *RETIRAR INVERSIÓN* 💰\n\n📝 Uso: .retirar <cantidad/all> <moneda>\n\n🎯 Monedas disponibles:\n• LILANCOIN 🟡\n• DRAGONTOKEN 🔴\n• UNISTAR 🔵\n\n💡 Ejemplos:\n• .retirar 0.5 DRAGONTOKEN\n• .retirar all LILANCOIN\n• .retirar 2.0 UNISTAR\n\n📊 Usa .miinversion para ver tu portafolio`
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
            text: `❌ Moneda no encontrada.`
        });
        return;
    }

    // Verificar si tiene inversión en esa moneda
    if (user.inversiones[moneda].cantidad <= 0) {
        await sock.sendMessage(from, {
            text: `❌ No tienes inversión en ${precioInfo.nombre}.\n\n💼 Usa .miinversion para ver tu portafolio.`
        });
        return;
    }

    let cantidadMonedas;

    // Procesar cantidad
    if (cantidadInput === 'ALL') {
        cantidadMonedas = user.inversiones[moneda].cantidad;
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
    if (user.inversiones[moneda].cantidad < cantidadMonedas) {
        await sock.sendMessage(from, {
            text: `❌ No tienes suficientes ${precioInfo.nombre}.\n\n💼 Tienes: ${user.inversiones[moneda].cantidad.toFixed(4)}\n💸 Intentas retirar: ${cantidadMonedas.toFixed(4)}`
        });
        return;
    }

    // Calcular valor de retiro
    const valorRetiro = cantidadMonedas * precioInfo.precioActual;
    const inversionOriginal = (user.inversiones[moneda].inversionTotal / user.inversiones[moneda].cantidad) * cantidadMonedas;
    const gananciaPerdida = valorRetiro - inversionOriginal;

    // Realizar retiro
    user.pandacoins += valorRetiro;
    user.inversiones[moneda].cantidad -= cantidadMonedas;
    user.inversiones[moneda].inversionTotal -= inversionOriginal;

    guardarDatabase(db);

    const resultadoEmoji = gananciaPerdida >= 0 ? '📈' : '📉';
    const resultadoTexto = gananciaPerdida >= 0 ? 'GANANCIA' : 'PÉRDIDA';

    await sock.sendMessage(from, {
        text: `✅ *RETIRO EXITOSO!* ✅\n\n${precioInfo.color} *Moneda:* ${precioInfo.nombre}\n🪙 *Monedas retiradas:* ${cantidadMonedas.toFixed(4)}\n💰 *Valor recibido:* ${valorRetiro.toFixed(0).toLocaleString()} 🐼\n${resultadoEmoji} *${resultadoTexto}:* ${Math.abs(gananciaPerdida).toFixed(0).toLocaleString()} 🐼\n\n💼 *Portafolio actual:*\n• ${precioInfo.nombre}: ${user.inversiones[moneda].cantidad.toFixed(4)} monedas\n💰 *Saldo total:* ${user.pandacoins.toLocaleString()} 🐼`
    });
}
