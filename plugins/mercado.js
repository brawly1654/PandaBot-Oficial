import { actualizarMercado, obtenerEstadoMercado } from '../lib/cryptoManager.js';

export const command = 'mercado';
export const aliases = ['market'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;

    // Actualizar y obtener estado del mercado
    await actualizarMercado();
    const mercado = await obtenerEstadoMercado();

    let mensaje = `🏦 *MERCADO CRIPTO* 🏦\n\n`;
    mensaje += `🕒 *Última actualización:* ${new Date(mercado.ultimaActualizacion).toLocaleTimeString()}\n\n`;

    Object.values(mercado.monedas).forEach(moneda => {
        const cambio = moneda.precioActual - moneda.precioAnterior;
        const porcentaje = (cambio / moneda.precioAnterior) * 100;
        const tendencia = cambio >= 0 ? '📈' : '📉';
        const colorFlecha = cambio >= 0 ? '🟢' : '🔴';

        mensaje += `${moneda.color} *${moneda.nombre}*\n`;
        mensaje += `💰 Precio: ${moneda.precioActual.toFixed(2)} 🐼\n`;
        mensaje += `${tendencia} Cambio: ${colorFlecha} ${cambio >= 0 ? '+' : ''}${cambio.toFixed(2)} (${porcentaje >= 0 ? '+' : ''}${porcentaje.toFixed(2)}%)\n`;
        mensaje += `🎯 Volatilidad: ${(moneda.volatilidad * 100).toFixed(1)}%\n\n`;
    });

    mensaje += `💡 *Invertir:* .invertir <cantidad> <moneda>\n`;
    mensaje += `📊 *Tu portafolio:* .miinversion`;

    await sock.sendMessage(from, { text: mensaje });
}
