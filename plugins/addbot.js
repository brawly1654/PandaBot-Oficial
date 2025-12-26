import fs from 'fs';
import path from 'path';

const CREADOR_JID = '120363420237055271@g.us';
const owners = ['56953508566', '166164298780822'];
const requestsFile = path.resolve('./data/joinrequests.json');

function loadRequests() {
  if (!fs.existsSync(requestsFile)) {
    fs.writeFileSync(requestsFile, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(requestsFile));
}

function saveRequests(requests) {
  fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2));
}

export const command = 'addbot';
export const aliases = ['unete', 'join'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const nombre = msg.pushName || 'Usuario';
  const subCommand = args[0]?.toLowerCase();
  const requestId = parseInt(args[1]);

  if (subCommand === 'aceptar' || subCommand === 'rechazar') {
    if (!owners.includes(senderNumber)) {
      await sock.sendMessage(from, { 
        text: '❌ Solo los dueños del bot pueden usar este comando.' 
      });
      return;
    }

    const requests = loadRequests();
    const request = requests.find(r => r.id === requestId && r.status === 'pending');

    if (!request) {
      await sock.sendMessage(from, { 
        text: `❌ No se encontró la solicitud #${requestId} pendiente.` 
      });
      return;
    }

    if (subCommand === 'aceptar') {
      try {
        const groupLink = request.groupLink;
        const inviteCode = groupLink.split('/').pop();
        
        console.log(`🔗 Intentando unirse al grupo con código: ${inviteCode}`);
        
        await sock.groupAcceptInvite(inviteCode);
        
        request.status = 'accepted';
        request.acceptedAt = Date.now();
        saveRequests(requests);
        
        await sock.sendMessage(from, { 
          text: `✅ Solicitud #${requestId} aceptada. El bot se unió al grupo exitosamente.` 
        });
        
        try {
          await sock.sendMessage(request.senderJid, { 
            text: `🎉 ¡Tu solicitud ha sido aprobada! PandaBot se unió a tu grupo.\n\n💡 Recuerda hacer al bot admin para que funcione correctamente.` 
          });
        } catch (notifyError) {
          console.log('No se pudo notificar al usuario:', notifyError.message);
        }
        
      } catch (error) {
        console.error('Error al unirse al grupo:', error);
        await sock.sendMessage(from, { 
          text: `❌ Error al unirse al grupo: ${error.message}\n\n🔍 Posibles causas:\n• El enlace es inválido o expiró\n• El bot fue removido previamente\n• El grupo está lleno\n• Restricciones de privacidad` 
        });
      }
    } else {
      request.status = 'rejected';
      request.rejectedAt = Date.now();
      saveRequests(requests);
      
      await sock.sendMessage(from, { 
        text: `❌ Solicitud #${requestId} rechazada.` 
      });
      
      try {
        await sock.sendMessage(request.senderJid, { 
          text: `💔 Tu solicitud para que PandaBot se una a tu grupo ha sido rechazada.\n\n📋 Posibles razones:\n• El grupo no cumple los requisitos\n• Límite de grupos alcanzado\n• Solicitud duplicada` 
        });
      } catch (notifyError) {
        console.log('No se pudo notificar al usuario:', notifyError.message);
      }
    }
    return;
  }


  const groupLink = args[0];
  const linkRegex = /https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]{22}/;

  if (!groupLink || !linkRegex.test(groupLink)) {
    await sock.sendMessage(from, { 
      text: `❌ Debes proporcionar un enlace de invitación válido.\n\n📝 Formato: https://chat.whatsapp.com/CODIGO\n\n💡 Ejemplo: .addbot https://chat.whatsapp.com/ABC123def456GHI789jklMNO` 
    });
    return;
  }


  const requests = loadRequests();
  const existingRequest = requests.find(r => 
    r.groupLink === groupLink && r.status === 'pending'
  );

  if (existingRequest) {
    await sock.sendMessage(from, { 
      text: `⏳ Ya existe una solicitud pendiente para este grupo (ID: #${existingRequest.id}). Por favor espera la respuesta.` 
    });
    return;
  }


  const newRequestId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1;

  const newRequest = {
    id: newRequestId,
    senderJid: sender,
    senderNumber: senderNumber,
    groupLink: groupLink,
    status: 'pending',
    timestamp: Date.now(),
    senderName: nombre
  };
  
  requests.push(newRequest);
  saveRequests(requests);


  const notificationText = `
🔔 *NUEVA SOLICITUD DE GRUPO*

📋 *ID:* #${newRequestId}
👤 *Usuario:* ${nombre}
📞 *Número:* ${senderNumber}
🔗 *Enlace:* ${groupLink}
⏰ *Fecha:* ${new Date().toLocaleString()}

✅ *Aceptar:* 
.addbot aceptar ${newRequestId}

❌ *Rechazar:* 
.addbot rechazar ${newRequestId}
`;


  for (const owner of owners) {
    try {
      await sock.sendMessage(`${owner}@s.whatsapp.net`, { 
        text: notificationText 
      });
    } catch (error) {
      console.log(`No se pudo notificar al owner ${owner}:`, error.message);
    }
  }

  
  await sock.sendMessage(from, { 
    text: `✅ Tu solicitud ha sido enviada con el ID *#${newRequestId}*.\n\n📞 Los administradores revisarán tu solicitud y te notificarán la decisión.\n\n⏳ Por favor ten paciencia.` 
  });
}

