export const command = 'linea1';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 1 (San Pablo – Los Dominicos) 
San Pablo (combinación L5)
Neptuno
Pajaritos
Las Rejas
San Alberto Hurtado
Estación Central
Universidad de Santiago
Los Héroes (combinación L2)
La Moneda
Universidad de Chile (combinación L3)
Santa Lucía
Universidad Católica
Baquedano (combinación L5)
Salvador
Manuel Montt
Pedro de Valdivia
Los Leones (combinación L6)
Tobalaba (combinación L4)
El Golf
Alcántara
Escuela Militar
Manquehue
Hernando de Magallanes
Los Dominicos`;
  
  await sock.sendMessage(from, { text: message });
}