export const command = 'linea2';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 2 (Vespucio Norte – Hospital El Pino) 
Vespucio Norte
Zapadores
Dorsal
Einstein
Cementerios
Cerro Blanco
Patronato
Puente Cal y Canto (combinación L3)
Santa Ana (combinación L5)
Los Héroes (combinación L1)
Toesca
Parque O'Higgins
Rondizzoni
Franklin (combinación L6)
El Llano
San Miguel
Ciudad del Niño
Lo Ovalle
El Parrón
La Cisterna (combinación L4A)
[Estaciones de Extensión Sur]
Hospital El Pino`;
  
  await sock.sendMessage(from, { text: message });
}