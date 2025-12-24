export const command = 'linea6';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  
  const message = `Línea 6 (Cerrillos – Los Leones) 
Cerrillos
Lo Valledor (combinación Metrotren Nos)
Presidente Pedro Aguirre Cerda
Franklin (combinación L2)
Bío Bío
Ñuble (combinación L5)
Estadio Nacional
Ñuñoa (combinación L3)
Inés de Suárez
Los Leones (combinación L1)`;
  
  await sock.sendMessage(from, { text: message });
}