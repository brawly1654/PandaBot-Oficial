export const command = 'linea3';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 3 (Los Libertadores – Plaza de Quilicura)
Los Libertadores
Cardenal Caro
Vivaceta
Conchalí
Plaza Chacabuco
Hospitales
Puente Cal y Canto (combinación L2)
Plaza de Armas (combinación L5)
Universidad de Chile (combinación L1)
Parque Almagro
Matta
Irarrázaval (combinación L5)
Monseñor Eyzaguirre
Ñuñoa (combinación L6)
Chile España
Villa Frei
Plaza Egaña (combinación L4)
Fernando Castillo Velasco`;
  
  await sock.sendMessage(from, { text: message });
}