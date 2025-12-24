import { setCustomPrefix, getCurrentPrefixes, resetPrefix } from '../handler.js';
import { ownerNumber } from '../config.js';
import { prefix as globalPrefixes } from '../config.js';

export const command = 'setprefix';
export const aliases = ['prefix', 'changeprefix'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
  
  // Verificar si es owner
  if (!ownerNumber.includes(`+${sender}`)) {
    return await sock.sendMessage(from, {
      text: '❌ Solo los owners pueden cambiar los prefijos del bot.'
    });
  }
  
  const subcomando = args[0]?.toLowerCase() || 'help';
  
  switch (subcomando) {
    case 'set':
    case 'add':
    case 'cambiar':
      if (args.length < 2) {
        return await sock.sendMessage(from, {
          text: `❌ Uso: .setprefix set <prefijo1> <prefijo2> ...\n💡 Ejemplo: .setprefix set ! $ /`
        });
      }
      
      const newPrefixes = args.slice(1);
      const result = await setCustomPrefix(sock, from, newPrefixes);
      
      await sock.sendMessage(from, {
        text: result.success 
          ? result.message 
          : `❌ Error: ${result.error}`
      });
      break;
      
    case 'view':
    case 'ver':
    case 'list':
      const currentPrefixes = getCurrentPrefixes(from);
      const isCustom = JSON.stringify(currentPrefixes) !== JSON.stringify(globalPrefixes);
      
      let message = `🔤 *PREFIJOS CONFIGURADOS*\n\n`;
      message += `💬 *Chat:* ${from.endsWith('@g.us') ? 'Grupo' : 'Privado'}\n`;
      message += `📝 *Tipo:* ${isCustom ? 'Personalizado' : 'Global'}\n\n`;
      message += `🎯 *Prefijos activos:*\n`;
      currentPrefixes.forEach((p, i) => {
        message += `  ${i + 1}. \`${p}\` (ej: ${p}menu)\n`;
      });
      
      if (isCustom) {
        message += `\n⚙️ *Para restaurar prefijos globales:*\n.setprefix reset`;
      }
      
      message += `\n🔧 *Prefijos globales disponibles:* ${globalPrefixes.join(', ')}`;
      
      await sock.sendMessage(from, { text: message });
      break;
      
    case 'reset':
    case 'restore':
    case 'default':
      const resetResult = resetPrefix(from);
      
      await sock.sendMessage(from, {
        text: resetResult.success
          ? `✅ *Prefijos restablecidos*\n\nAhora los prefijos para este chat son:\n${globalPrefixes.map(p => `• ${p}`).join('\n')}`
          : `❌ Error: ${resetResult.error}`
      });
      break;
      
    case 'help':
    case 'ayuda':
    default:
      const ayuda = `🔤 *SISTEMA DE PREFIJOS MULTIPLES*\n\n` +
                   `🎯 *Prefijos globales:* ${globalPrefixes.join(', ')}\n\n` +
                   `📝 *COMANDOS DISPONIBLES:*\n` +
                   `• .setprefix set <prefijos> - Establecer prefijos personalizados\n` +
                   `• .setprefix view - Ver prefijos actuales\n` +
                   `• .setprefix reset - Restaurar prefijos globales\n` +
                   `• .setprefix help - Esta ayuda\n\n` +
                   `💡 *EJEMPLOS:*\n` +
                   `• .setprefix set ! $\n` +
                   `• .setprefix set / > -\n` +
                   `• .setprefix set @ # & *\n\n` +
                   `⚠️ *NOTA:* Solo disponible para owners del bot`;
      
      await sock.sendMessage(from, { text: ayuda });
      break;
  }
}
