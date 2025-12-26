import { ownerNumber } from '../config.js';

export const command = 'coronar';
export const aliases = ['crown', 'makeadmin'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];


  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  if (!isOwner) {
    await sock.sendMessage(from, { 
      text: '❌ Solo los owners pueden usar este comando.' 
    }, { quoted: msg });
    return;
  }


  if (!from.endsWith('@g.us')) {
    await sock.sendMessage(from, { 
      text: '❌ Este comando solo funciona en grupos.' 
    }, { quoted: msg });
    return;
  }

  try {

    await sock.groupParticipantsUpdate(from, [sender], 'promote');

    await sock.sendMessage(from, { 
      text: `👑 *¡CORONADO!*\n\nAhora eres administrador del grupo.\n\n¡Larga vida al Owner! 🎉` 
    }, { quoted: msg });

  } catch (error) {
    console.error('Error en comando coronar:', error);
    
    let errorMessage = '❌ No se pudo coronar. ';
    
    if (error.message?.includes('not authorized')) {
      errorMessage += 'El bot no es administrador o no tiene permisos.';
    } else if (error.message?.includes('401')) {
      errorMessage += 'El bot fue removido como administrador.';
    } else if (error.message?.includes('403')) {
      errorMessage += 'No tienes permisos para ser administrador.';
    } else {
      errorMessage += 'El bot necesita ser administrador.';
    }
    
    await sock.sendMessage(from, { 
      text: errorMessage 
    }, { quoted: msg });
  }
}