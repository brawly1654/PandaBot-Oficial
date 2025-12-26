import { comprarAsiento } from "../PandaLove/pizzeria.js";

export const command = 'comprarasientos';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const loadingMsg = await sock.sendMessage(from, { text: `⏳ Comprando asientos para tu pizzería...` });

  try {
    let totalComprados = 0;
    let lastResponse = null;
    let prevResponse = null;
    let stopReason = null;

    while (true) {
      let response;
      try {
        response = await comprarAsiento(sender);
      } catch (err) {
        stopReason = "❌ Error al ejecutar comprarAsiento: " + err.message;
        break;
      }

      if (response.error) {
        stopReason = `⚠️ ${response.error}`;
        lastResponse = response;
        break;
      }

      totalComprados++;
      prevResponse = lastResponse;
      lastResponse = response;
    }

    if (totalComprados === 0) {
      await sock.sendMessage(from, { text: `❌ No se pudo comprar ningún asiento.\n\n${stopReason}` }, { quoted: loadingMsg });
      return;
    }


    const finalResponse = lastResponse?.error ? prevResponse : lastResponse;

    if (!finalResponse) {
      await sock.sendMessage(from, { text: `❌ No se pudo determinar el estado final de la compra.` }, { quoted: loadingMsg });
      return;
    }

    const { new_chairs, remaining_coins } = finalResponse;

    const mensaje = `
✅ ¡Has comprado ${totalComprados} asiento(s) seguidos!

*Asientos Totales:* ${new_chairs}
*PizzaCoins Restantes:* ${remaining_coins.toFixed(2)}

${stopReason ? stopReason : ""}
`;

    await sock.sendMessage(from, { text: mensaje }, { quoted: loadingMsg });

  } catch (error) {
    console.error('❌ Error al conectar con la API de la pizzería:', error);
    await sock.sendMessage(from, { text: `*❌ Hubo un error de conexión con la API de la pizzería. Inténtalo más tarde.*` });
  }
}
