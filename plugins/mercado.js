import { actualizarMercado, obtenerEstadoMercado, obtenerTiempoProximaActualizacion, obtenerAnalisisMoneda } from '../lib/cryptoManager.js';
import { trackMercado } from '../middleware/trackAchievements.js';

export const command = 'mercado';
export const aliases = ['market'];

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Enviar mensaje de carga
    const loadingMsg = await sock.sendMessage(from, {
        text: `🔄 *Actualizando datos del mercado...*\n📊 Calculando tendencias y análisis...`
    });

    // Actualizar y obtener estado del mercado
    await actualizarMercado();
    const mercado = await obtenerEstadoMercado();
    const tiempoRestante = obtenerTiempoProximaActualizacion();

    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;

    let mensaje = `🏦 *MERCADO CRIPTO* 🏦\n\n`;
    mensaje += `🕒 *Última actualización:* ${new Date(mercado.ultimaActualizacion).toLocaleTimeString()}\n`;
    mensaje += `⏰ *Próxima actualización:* ${minutos}:${segundos.toString().padStart(2, '0')}\n\n`;

    Object.values(mercado.monedas).forEach(moneda => {
        const cambio = moneda.precioActual - moneda.precioAnterior;
        const porcentaje = (cambio / moneda.precioAnterior) * 100;
        const tendencia = cambio >= 0 ? '📈' : '📉';
        const colorFlecha = cambio >= 0 ? '🟢' : '🔴';
        const analisis = obtenerAnalisisMoneda(moneda);

        mensaje += `${moneda.color} *${moneda.nombre}*\n`;
        mensaje += `💰 Precio: ${moneda.precioActual.toFixed(2)} 🐼\n`;
        mensaje += `${tendencia} Cambio: ${colorFlecha} ${cambio >= 0 ? '+' : ''}${cambio.toFixed(2)} (${porcentaje >= 0 ? '+' : ''}${porcentaje.toFixed(2)}%)\n`;
        mensaje += `🎯 Volatilidad: ${(moneda.volatilidad * 100).toFixed(1)}%\n`;
        mensaje += `📊 ${analisis}\n\n`;
    });

    mensaje += `💡 *Invertir:* .invertir <cantidad> <moneda>\n`;
    mensaje += `📊 *Tu portafolio:* .miinversion\n`;
    mensaje += `🔔 *Actualiza cada 5 minutos*`;

    // Editar mensaje de carga con la información completa
    await sock.sendMessage(from, { 
        text: mensaje 
    }, { 
        edit: loadingMsg.key 
    });
    try { trackMercado(sender, sock, from); } catch (e) {}
}
