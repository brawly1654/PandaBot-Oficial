export const command = 'pornhub';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Videos Porno y Películas De Sexo Gratis - Porno, XXX, Porno Tube | Pornhub https://share.google/FT4XCs80dqV7JzDv5`;
  
  await sock.sendMessage(from, { text: message });
}