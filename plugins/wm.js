// plugins/watermark.js
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { extractStickerMetadata, createStickerWithNewMetadata, saveTempFile } from '../lib/stickerUtils.js';
import { trackStickersCreated } from '../middleware/trackAchievements.js';
import fs from 'fs';
import path from 'path';

export const command = 'wm';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const sender = msg.key.participant || msg.key.remoteJid;
  const userId = sender.split('@')[0];

  // Verificar que se esté citando un sticker
  if (!quoted || !quoted.stickerMessage) {
    await sock.sendMessage(from, {
      text: `❌ *USO INCORRECTO*\n\nDebes citar un sticker para modificar su watermark.\n\n📌 *Ejemplos:*\n\`.wm MiPack • por MiNombre\` → Cambia texto\n\`.wm\` → Quita el watermark\n\`.wm info\` → Ver metadata actual\n\n🔧 *Sintaxis:* \`.wm [packname • author]\``
    }, { quoted: msg });
    return;
  }

  try {
    // Descargar el sticker citado
    const stickerBuffer = await downloadMediaMessage(
      { 
        key: { 
          remoteJid: from, 
          id: msg.key.id, 
          fromMe: msg.key.fromMe 
        }, 
        message: quoted 
      },
      'buffer',
      {},
      { logger: console }
    );

    // Extraer metadata actual del sticker
    const currentMetadata = await extractStickerMetadata(stickerBuffer);
    
    // Si no hay argumentos, quitar el watermark
    if (args.length === 0) {
      // Crear sticker sin metadata (solo el buffer original sin EXIF)
      const img = new (await import('node-webpmux')).Image();
      await img.load(stickerBuffer);
      img.exif = undefined; // Eliminar metadata
      const cleanSticker = await img.save(null);
      
      await sock.sendMessage(from, { 
        sticker: cleanSticker 
      }, { quoted: msg });
      try { trackStickersCreated(sender, sock, from); } catch (e) {}
      
      await sock.sendMessage(from, {
        text: `✅ *WATERMARK ELIMINADO*\n\n📝 El sticker ahora no muestra ningún texto.\n\n💡 Para añadir texto: \`.wm Mi Pack • por Mi Nombre\``
      });
      return;
    }

    // Si el primer argumento es "info", mostrar metadata actual
    if (args[0].toLowerCase() === 'info') {
      if (!currentMetadata) {
        await sock.sendMessage(from, {
          text: `ℹ️ *INFORMACIÓN DEL STICKER*\n\n📝 Este sticker no tiene metadata (no muestra texto).\n\n💡 Para añadir texto: \`.wm Mi Pack • por Mi Nombre\``
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `ℹ️ *INFORMACIÓN DEL STICKER*\n\n🏷️ *Packname:* ${currentMetadata.packname}\n👤 *Author:* ${currentMetadata.author}\n🎯 *Emojis:* ${currentMetadata.categories.join(', ') || 'Ninguno'}\n\n💡 Para cambiar: \`.wm Nuevo Pack • Nuevo Autor\``
        }, { quoted: msg });
      }
      return;
    }

    // Si el primer argumento es "reset", restaurar defaults
    if (args[0].toLowerCase() === 'reset') {
      const newSticker = await createStickerWithNewMetadata(stickerBuffer, {
        packname: 'PandaBot 🐼',
        author: 'by lukas 💻',
        categories: currentMetadata?.categories || ['']
      });
      
      await sock.sendMessage(from, { 
        sticker: newSticker 
      }, { quoted: msg });
      try { trackStickersCreated(sender, sock, from); } catch (e) {}
      
      await sock.sendMessage(from, {
        text: `🔄 *WATERMARK RESTAURADO*\n\n📝 Texto restaurado a:\n🏷️ Pack: PandaBot 🐼\n👤 Author: by lukas 💻`
      });
      return;
    }

    // Procesar el texto del watermark
    const textoCompleto = args.join(' ');
    
    // Detectar si tiene separador "•" o similar
    let nuevoPackname = '';
    let nuevoAuthor = '';
    
    if (textoCompleto.includes('•')) {
      const partes = textoCompleto.split('•').map(p => p.trim());
      nuevoPackname = partes[0] || '';
      nuevoAuthor = partes.slice(1).join(' • ') || '';
    } else if (textoCompleto.includes('|')) {
      const partes = textoCompleto.split('|').map(p => p.trim());
      nuevoPackname = partes[0] || '';
      nuevoAuthor = partes.slice(1).join(' | ') || '';
    } else if (textoCompleto.includes('por') || textoCompleto.includes('by')) {
      // Intentar separar por "por" o "by"
      const lowerText = textoCompleto.toLowerCase();
      const porIndex = lowerText.indexOf(' por ');
      const byIndex = lowerText.indexOf(' by ');
      
      if (porIndex !== -1) {
        nuevoPackname = textoCompleto.substring(0, porIndex).trim();
        nuevoAuthor = 'por ' + textoCompleto.substring(porIndex + 4).trim();
      } else if (byIndex !== -1) {
        nuevoPackname = textoCompleto.substring(0, byIndex).trim();
        nuevoAuthor = 'by ' + textoCompleto.substring(byIndex + 3).trim();
      } else {
        nuevoPackname = textoCompleto;
        nuevoAuthor = 'by ' + userId;
      }
    } else {
      // Si no hay separador, usar todo como packname y añadir autor por defecto
      nuevoPackname = textoCompleto;
      nuevoAuthor = 'by ' + userId;
    }
    
    // Limitar longitud
    if (nuevoPackname.length > 30) {
      nuevoPackname = nuevoPackname.substring(0, 30) + '...';
    }
    
    if (nuevoAuthor.length > 20) {
      nuevoAuthor = nuevoAuthor.substring(0, 20) + '...';
    }
    
    // Si el packname está vacío, usar defaults
    if (!nuevoPackname.trim()) {
      nuevoPackname = 'Mis Stickers';
    }
    
    // Crear sticker con nueva metadata
    const newSticker = await createStickerWithNewMetadata(stickerBuffer, {
      packname: nuevoPackname,
      author: nuevoAuthor,
      categories: currentMetadata?.categories || ['']
    });
    
    // Enviar el nuevo sticker
    await sock.sendMessage(from, { 
      sticker: newSticker 
    }, { quoted: msg });
    try { trackStickersCreated(sender, sock, from); } catch (e) {}
    
    // Enviar mensaje de confirmación
    const confirmacion = `✅ *WATERMARK MODIFICADO*\n\n📝 Nuevo texto del sticker:\n🏷️ *Pack:* ${nuevoPackname}\n👤 *Author:* ${nuevoAuthor}\n\n💡 *Consejos:*\n• Usa "•" para separar pack y autor\n• Ejemplo: \`.wm Mi Pack • por ${userId}\`\n• \`.wm info\` para ver metadata\n• \`.wm\` para quitar texto\n• \`.wm reset\` para defaults`;
    
    await sock.sendMessage(from, {
      text: confirmacion
    });

  } catch (error) {
    console.error('❌ Error en comando .wm:', error);
    
    // Mensajes de error específicos
    let errorMsg = '❌ Error al procesar el sticker.';
    
    if (error.message.includes('node-webpmux')) {
      errorMsg += '\n\n⚠️ No se pudo leer el formato del sticker.';
    } else if (error.message.includes('download')) {
      errorMsg += '\n\n⚠️ No se pudo descargar el sticker.';
    } else if (error.message.includes('JSON')) {
      errorMsg += '\n\n⚠️ El sticker tiene metadata corrupta.';
    }
    
    await sock.sendMessage(from, {
      text: errorMsg + '\n\n💡 Intenta con otro sticker o usa imágenes normales.'
    }, { quoted: msg });
  }
}

// Función para mostrar ayuda detallada
export async function mostrarAyudaCompleta(sock, from) {
  const ayuda = `🎨 *COMANDO .wm (WATERMARK)*\n\n` +
               `📌 *Modifica el texto de los stickers*\n\n` +
               `🔧 *USO BÁSICO:*\n` +
               `• Cita un sticker y escribe:\n` +
               `  \`.wm Mi Pack • por Mi Nombre\`\n` +
               `• O simplemente: \`.wm\` para quitar texto\n\n` +
               `🎯 *EJEMPLOS:*\n` +
               `\`.wm Anime Pack • por ${from.split('@')[0]}\`\n` +
               `\`.wm Memes Divertidos\`\n` +
               `\`.wm\` (sin texto = quitar watermark)\n` +
               `\`.wm info\` (ver metadata actual)\n` +
               `\`.wm reset\` (restaurar defaults)\n\n` +
               `💡 *FORMATOS ACEPTADOS:*\n` +
               `• Pack • Author\n` +
               `• Pack | Author\n` +
               `• Pack por Author\n` +
               `• Pack by Author\n\n` +
               `⚠️ *NOTA:* Solo funciona con stickers estáticos (imágenes)`;
  
  await sock.sendMessage(from, { text: ayuda });
}
