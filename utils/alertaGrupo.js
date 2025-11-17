export async function enviarAlerta(sock, texto) {
const grupo = '120363420237055271@g.us';

  try {
    const info = await sock.groupMetadata(grupo);
    const participantes = info.participants.map(p => p.id);
    const mensaje = {
      text: texto,
      mentions: participantes
    };

    await sock.sendMessage(grupo, mensaje);
  } catch (err) {
    console.error('❌ Error al enviar alerta al grupo:', err);
  }
}
