export const command = 'cp';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `©️🅿️❤️‍🩹`;
  
  await sock.sendMessage(from, { text: message });
}