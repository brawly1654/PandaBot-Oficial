export const command = '.buy';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `buena`;
  
  await sock.sendMessage(from, { text: message });
}