export const command = 'minae';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `escribelo bien, inútil`;
  
  await sock.sendMessage(from, { text: message });
}