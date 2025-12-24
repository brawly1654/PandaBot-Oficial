export const command = 'linea4';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `
Línea 4 (Tobalaba – Plaza de Puente Alto) 
Tobalaba (combinación L1)
Cristóbal Colón
Francisco Bilbao
Príncipe de Gales
Simón Bolívar
Plaza Egaña (combinación L3)
Los Orientales
Grecia
Los Presidentes
Quilín
[Resto de estaciones, incluyendo:]
Vicuña Mackenna (combinación L4A)
Vicente Valdés (combinación L5)
Plaza de Puente Alto
 `;
  
  await sock.sendMessage(from, { text: message });
}