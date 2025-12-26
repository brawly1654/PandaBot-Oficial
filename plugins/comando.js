import fs from 'fs';
import path from 'path';
import { ownerNumber } from '../config.js';

export const command = 'comando';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
    
    if (!ownerNumber.includes(`+${sender}`)) {
        await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
        return;
    }


    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        await sock.sendMessage(from, {
            text: '❌ Debes citar el mensaje que contiene el código del comando.\n\n📝 Ejemplo:\nResponde a un mensaje con código usando: .comando buy.js'
        });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `💻 *SISTEMA DE CREACIÓN DE COMANDOS* 💻\n\n📝 Uso: .comando <nombre-archivo.js> (citando el código)\n\n💡 Ejemplos:\n• .comando buy.js\n• .comando misc/helper.js\n• .comando eventos/navidad.js\n\n⚠️ Precaución: Esto reemplazará archivos existentes.`
        });
        return;
    }

    const nombreArchivo = args[0];
    

    if (!nombreArchivo.endsWith('.js')) {
        await sock.sendMessage(from, {
            text: '❌ El archivo debe tener extensión .js\n\n💡 Ejemplo: .comando buy.js'
        });
        return;
    }


    const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
    let codigo = '';


    if (quotedMsg.conversation) {
        codigo = quotedMsg.conversation;
    } else if (quotedMsg.extendedTextMessage?.text) {
        codigo = quotedMsg.extendedTextMessage.text;
    } else {
        await sock.sendMessage(from, {
            text: '❌ El mensaje citado no contiene texto válido.\n\n💡 Asegúrate de citar un mensaje con código JavaScript.'
        });
        return;
    }

    try {
        const rutaArchivo = path.join('./plugins', nombreArchivo);
        const directorio = path.dirname(rutaArchivo);


        if (!fs.existsSync(directorio)) {
            fs.mkdirSync(directorio, { recursive: true });
        }


        const existe = fs.existsSync(rutaArchivo);
        

        fs.writeFileSync(rutaArchivo, codigo, 'utf8');

        if (existe) {
            await sock.sendMessage(from, {
                text: `✅ *COMANDO ACTUALIZADO* ✅\n\n📁 Archivo: ${nombreArchivo}\n📏 Tamaño: ${codigo.length} caracteres\n🕒 Actualizado: ${new Date().toLocaleString()}\n\n🔄 El comando estará disponible después de reiniciar el bot.`
            });
        } else {
            await sock.sendMessage(from, {
                text: `🎉 *NUEVO COMANDO CREADO* 🎉\n\n📁 Archivo: ${nombreArchivo}\n📏 Tamaño: ${codigo.length} caracteres\n🕒 Creado: ${new Date().toLocaleString()}\n\n🔄 El comando estará disponible después de reiniciar el bot.`
            });
        }


        console.log(`📝 Comando ${existe ? 'actualizado' : 'creado'}: ${nombreArchivo} por ${sender}`);

    } catch (error) {
        console.error('Error creando comando:', error);
        await sock.sendMessage(from, {
            text: `❌ Error al crear el comando:\n${error.message}`
        });
    }
}


function esCodigoValido(codigo) {
    const codigoLimpio = codigo.trim();
    

    if (codigoLimpio.length < 10) return false; 
    if (!codigoLimpio.includes('export')) return false;
    if (!codigoLimpio.includes('run') && !codigoLimpio.includes('handler')) return false;
    

    const patronesValidos = [
        /export\s+(const|let|var|async|function)/,
        /import\s+.*from/,
        /function\s+\w+/,
        /=>/,
        /\(.*\)\s*=>/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        /switch\s*\(/,
        /console\./,
        /await\s+/
    ];

    return patronesValidos.some(patron => patron.test(codigoLimpio));
}
