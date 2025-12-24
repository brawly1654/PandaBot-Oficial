export const command = 'linea5';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 5 (Plaza de Maipú – Vicente Valdés) 
Plaza de Maipú
Santiago Bueras
Del Sol
Monte Tabor
Las Parcelas
Laguna Sur
Barrancas
Pudahuel
San Pablo (combinación L1)
Gruta de Lourdes
Quinta Normal
Cumming
Santa Ana (combinación L2)
Plaza de Armas (combinación L3)
Bellas Artes
Baquedano (combinación L1)
Parque Bustamante
[Resto de estaciones, incluyendo:]
Ñuble (combinación L6)
Irarrázaval (combinación L3)
Vicente Valdés (combinación L4)`;
  
  await sock.sendMessage(from, { text: message });
}