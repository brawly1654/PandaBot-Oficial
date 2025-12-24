import { ownerNumber } from '../config.js';
export const command = 'menuowners';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const metadata = await sock.groupMetadata(from);
  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  if (!isOwner) {
    await sock.sendMessage(from, { text: '❌ Solo los Owners pueden usar este comando.' });
    return;
  }

  const message = `🅞⃞𝘄𝗻֟𝗲𝗿:                                                                                                                                                                           
- .activate <evento> (OWNER)
> Activas el efecto insertado.

- .add <recurso> <cantidad> @usuario (OWNER)
> Añades el recurso al usuario mencionado.

- .addowner @usuario (OWNER)
> Añades como nuevo Owner al usuario mencionado.

- .addps <nombre> | <calidad> | <precio> (OWNER)
> Agregas un personaje nuevo a la lista.

- .addstock <cantidad> <nombre> (OWNER)
> Añades stock al personaje insertado.

- .addvip <horas> @usuario (OWNER)
> Agregas al usuario como nuevo VIP de PandaBot por las horas descritas.

- .adjustprices (OWNER)
> Ajustas los precios de los personajes, usa el comando sin argumentos si quieres saber cómo usarlo.

- .asignartitulo <titulo> | @usuario (OWNER)
> Asignas el título insertado al usuario mencionado, el título se mostrará en su perfil si él lo equipa.

- .aviso <mensaje> (OWNER)
> Envías un mensaje global en PandaBot, se mostrará en todos los grupos donde él esté.

- .backup (OWNER)
> PandaBot genera un backup de la base de datos.

- .banuser @usuario <motivo> (OWNER)
> Baneas de PandaBot al usuario mencionado.

- .comando <archivo.js> (citando mensaje) (OWNER)
> Añades un nuevo comando a PandaBot, el mensaje citado debe ser un código.

- .coronar (OWNER)
> PandaBot te da el rol de administrador en el grupo.

- .creartitulo <Emoji+Nombre> | <Acá lo mismo> | <precio> (OWNER)
> Creas un título que se podrá comprar por Pandacoins.

- .defecar @usuario (OWNER)
> Defecas encima del usuario mencionado.

- .delowner @usuario (OWNER)
> Eliminas de Owner al usuario mencionado.

- .delps <nombre> (OWNER)
> Eliminas al personaje insertado, ya nadie lo podrá comprar ni obtener.

- .demoteall (OWNER)
> Quitas a todos los administradores del grupo.

- .descps <personaje> | <descripcion> (OWNER)
> Le añades una descripción al personaje insertado.

- .disable <función> (OWNER)
> Deshabilitas una función global.

- .drop <personaje/calidad> (OWNER)
> Regalas un personaje o un personaje aleatorio de alguna calidad a TODOS los usuarios registrados en PandaBot.

- .enable <funcion> (OWNER)
> Habilitas una función global.

- .eventocm (OWNER)
> Regalas una recompensa aleatoria de CM a todos los usuarios de PandaBot.

- .getcommand <comando sin el ".'> (OWNER)
> Comando para ver el código de algún plugin.

- .makecommand <comando> | <respuesta> (OWNER)
> Creas un comando simple en el bot.

- .mute @usuario (OWNER)
> A partir de ahora PandaBot eliminará todos los mensajes del usuario muteado.

- .nuke (OWNER)
> El bot elimina a todos los usuarios del grupo.

- .ordenarps (OWNER)
> Ordenas a los personajes de la lista según su precio.

- .pandabotlogs (OWNER)
> Revisas la consola del bot.

- .pandalogs (OWNER)
> Revisas los logs de PandaLove.

- .penalizar <recurso> <cantidad> @usuario (OWNER)
> Le penalizas recursos al usuario mencionado.

- .penalizarps <personaje> @usuario (OWNER)
> Le penalizas el personaje insertado al personaje mencionado.

- .reiniciar (OWNER)
> Reinicias el bot.

- .reply <sugerencia/reporte/pregunta <ID> <respuesta> (OWNER)
> Respondes al mensaje enviado por el usuario.

- .resetstock (OWNER)
> Reinicias los stocks de los personajes de la lista.

- .reunion <mensaje> (OWNER)
> Reúnes a los Owners en una instancia importante.

- .runpzz <funcion> (OWNER)
> Activas alguna función de la pizzería.

- .skipexpedicion (OWNER)
> Skipeas expediciones activas, ideal en eventos.

- .stop (OWNER)
> Apagas a PandaBot y el sistema de PandaLove.

- .unbanuser @usuario (OWNER)
> Desbaneas a un usuario del bot.

- .unmute @usuario (OWNER)
> Desmuteas al usuario mencionado.

- .makecode <nombre> <cantidad (- o +)> <usos> (OWNER)
> Creas un código canjeable por usuarios para ganar o perder Pandacoins.

- .viewcodes (OWNER)
> Revisas todos los códigos activos por el momento.

- .violar @usuario (OWNER)
> Te violas rico al usuario mencionado.`;
  
  await sock.sendMessage(from, { text: message });
}
