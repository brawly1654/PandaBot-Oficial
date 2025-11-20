import { cargarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';

export const command = 'miinversion';
export const aliases = ['myinvestment', 'portafolio'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender];

    if (!user || !user.inversiones) {
        await sock.sendMessage(from, {
            text: `📭 No tienes inversiones activas.\n\n💡 Comienza a invertir con: .invertir <cantidad> <moneda>`
        });
        return;
    }

    // Actualizar precios
    await actualizarMercado();

    let mensaje = `💼 *TU PORTAFOLIO DE INVERSIÓN* 💼\n\n`;
    
    let valorTotalPortafolio = 0;
    let inversionTotal = 0;
    let tieneInversiones = false;

    for (const [monedaId, inversion] of Object.entries(user.inversiones)) {
        if (inversion.cantidad > 0) {
            tieneInversiones = true;
            const precioInfo = await obtenerPrecioMoneda(monedaId);
            const valorActual = inversion.cantidad * precioInfo.precioActual;
            const gananciaPerdida = valorActual - inversion.inversionTotal;
            const porcentaje = (gananciaPerdida / inversion.inversionTotal) * 100;

            valorTotalPortafolio += valorActual;
            inversionTotal += inversion.inversionTotal;

            const tendencia = gananciaPerdida >= 0 ? '📈' : '📉';
            const emojiEstado = gananciaPerdida >= 0 ? '🟢' : '🔴';

            mensaje += `${precioInfo.color} *${precioInfo.nombre}*\n`;
            mensaje += `🪙 Cantidad: ${inversion.cantidad.toFixed(4)}\n`;
            mensaje += `💰 Valor actual: ${valorActual.toFixed(0).toLocaleString()} 🐼\n`;
            mensaje += `💸 Invertido: ${inversion.inversionTotal.toFixed(0).toLocaleString()} 🐼\n`;
            mensaje += `${tendencia} ${emojiEstado} ${gananciaPerdida >= 0 ? '+' : ''}${gananciaPerdida.toFixed(0).toLocaleString()} 🐼 (${porcentaje >= 0 ? '+' : ''}${porcentaje.toFixed(2)}%)\n\n`;
        }
    }

    if (!tieneInversiones) {
        await sock.sendMessage(from, {
            text: `📭 No tienes inversiones activas.\n\n💡 Comienza a invertir con: .invertir <cantidad> <moneda>`
        });
        return;
    }

    const gananciaTotal = valorTotalPortafolio - inversionTotal;
    const porcentajeTotal = (gananciaTotal / inversionTotal) * 100;

    mensaje += `📊 *RESUMEN TOTAL:*\n`;
    mensaje += `💰 Valor portafolio: ${valorTotalPortafolio.toFixed(0).toLocaleString()} 🐼\n`;
    mensaje += `💸 Total invertido: ${inversionTotal.toFixed(0).toLocaleString()} 🐼\n`;
    mensaje += `🎯 Ganancia/Pérdida: ${gananciaTotal >= 0 ? '+' : ''}${gananciaTotal.toFixed(0).toLocaleString()} 🐼 (${porcentajeTotal >= 0 ? '+' : ''}${porcentajeTotal.toFixed(2)}%)\n\n`;
    mensaje += `💡 *Saldo disponible:* ${user.pandacoins.toLocaleString()} 🐼`;

    await sock.sendMessage(from, { text: mensaje });
}
