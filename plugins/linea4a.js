export const command = 'linea4a';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 4A (Vicuña Mackenna – La Cisterna) 
Vicuña Mackenna (combinación L4)
Santa Julia
La Granja
Santa Rosa
San Ramón
La Cisterna (combinación L2)`;
  
  await sock.sendMessage(from, { text: message });
}