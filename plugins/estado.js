export const command = 'estado';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  
  let estado = '🔄 *ESTADO ACTUAL DEL BOT*\n\n';
  
  // Verificar comandos cargados
  estado += '*📋 COMANDOS CARGADOS:*\n';
  const comandos = Array.from(pluginsMap.keys());
  comandos.forEach(cmd => {
    estado += `✅ ${cmd}\n`;
  });
  
  // Verificar comandos problemáticos
  const problematicos = ['activate', 'buy', 'spawn'].filter(cmd => !comandos.includes(cmd));
  if (problematicos.length > 0) {
    estado += `\n*🚫 COMANDOS FALTANTES:*\n`;
    problematicos.forEach(cmd => {
      estado += `❌ ${cmd}\n`;
    });
  }
  
  await sock.sendMessage(from, { text: estado }, { quoted: msg });
}
