import { cargarProhibiciones } from './prohibir.js';

export const command = 'prohibiciones';
export const aliases = ['bannedcmds', 'blockedcommands'];
export const description = 'Ver comandos prohibidos';
export const category = 'utilidad';
export const usage = '.prohibiciones [@usuario]';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const senderNumber = sender.split('@')[0];
  
  // Owner numbers
  const ownerNumber = ["+56953508566", "+166164298780822", "+573023181375", "+97027992080542", 
                      "+5215538830665", "+267232999420158", "+230004726169681", "+12833748193431"];
  const isOwner = ownerNumber.includes(`+${senderNumber}`);
  
  const prohibiciones = cargarProhibiciones();
  
  // Si no hay argumentos, mostrar las propias
  if (args.length === 0) {
    const usuarioProhibiciones = prohibiciones[sender] || {};
    const comandos = Object.keys(usuarioProhibiciones);
    
    if (comandos.length === 0) {
      return await sock.sendMessage(from, {
        text: '✅ *SIN PROHIBICIONES*\n━━━━━━━━━━━━━━━━\nNo tienes ningún comando prohibido.\n━━━━━━━━━━━━━━━━\n🎉 ¡Puedes usar todos los comandos libremente!'
      });
    }
    
    let lista = '';
    for (const [comando, info] of Object.entries(usuarioProhibiciones)) {
      const tiempoRestante = info.tiempoExpiracion - Date.now();
      const horas = Math.floor(tiempoRestante / 3600000);
      const minutos = Math.floor((tiempoRestante % 3600000) / 60000);
      
      lista += `\n• *${comando}*: ${horas}h ${minutos}m restantes`;
    }
    
    return await sock.sendMessage(from, {
      text: `📋 *TUS COMANDOS PROHIBIDOS*\n━━━━━━━━━━━━━━━━${lista}\n━━━━━━━━━━━━━━━━\n⏰ Se desbloquearán automáticamente al expirar.`
    });
  }
  
  // Si hay argumentos y es owner
  if (isOwner && args[0]) {
    let usuarioBuscar = args[0];
    
    // Procesar mención
    if (usuarioBuscar.includes('@')) {
      if (usuarioBuscar.includes('@s.whatsapp.net')) {
        usuarioBuscar = usuarioBuscar;
      } else {
        const numero = usuarioBuscar.replace('@', '').replace(/[^\d]/g, '');
        usuarioBuscar = numero + '@s.whatsapp.net';
      }
    } else {
      usuarioBuscar = usuarioBuscar.replace(/[^\d]/g, '') + '@s.whatsapp.net';
    }
    
    const usuarioProhibiciones = prohibiciones[usuarioBuscar] || {};
    const comandos = Object.keys(usuarioProhibiciones);
    
    if (comandos.length === 0) {
      return await sock.sendMessage(from, {
        text: `✅ *SIN PROHIBICIONES*\n━━━━━━━━━━━━━━━━\n@${usuarioBuscar.split('@')[0]} no tiene comandos prohibidos.`,
        mentions: isGroup ? [usuarioBuscar] : []
      });
    }
    
    let lista = '';
    for (const [comando, info] of Object.entries(usuarioProhibiciones)) {
      const fechaExpiracion = new Date(info.tiempoExpiracion);
      const fechaFormateada = fechaExpiracion.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      lista += `\n• *${comando}*: Expira ${fechaFormateada}`;
    }
    
    return await sock.sendMessage(from, {
      text: `📋 *PROHIBICIONES DE @${usuarioBuscar.split('@')[0]}*\n━━━━━━━━━━━━━━━━${lista}\n━━━━━━━━━━━━━━━━\n👑 Vista de owner`,
      mentions: isGroup ? [usuarioBuscar] : []
    });
  }
  
  // Si no es owner y trata de ver otros
  if (!isOwner) {
    return await sock.sendMessage(from, {
      text: '❌ *ACCESO DENEGADO*\n━━━━━━━━━━━━━━━━\nSolo puedes ver tus propias prohibiciones.\n━━━━━━━━━━━━━━━━\n💡 Usa: .prohibiciones'
    });
  }
}
