import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { cargarDatos } from '../lib/cacheManager.js';

export const command = 'intercambiar';
export const aliases = ['trade', 'swap'];
export const description = 'Sistema de intercambio de personajes entre usuarios';
export const category = 'economía';

const intercambiosActivos = {};
const TIMEOUT_INTERCAMBIO = 5 * 60 * 1000;

function limpiarIntercambiosExpirados() {
    const ahora = Date.now();
    const ids = Object.keys(intercambiosActivos);
    ids.forEach(id => {
        if (ahora - intercambiosActivos[id].creadoEn > TIMEOUT_INTERCAMBIO) {
            delete intercambiosActivos[id];
        }
    });
}

function obtenerIntercambioPorUsuario(usuario) {
    const ids = Object.keys(intercambiosActivos);
    for (const id of ids) {
        const intercambio = intercambiosActivos[id];
        if (intercambio.usuario1 === usuario || intercambio.usuario2 === usuario) {
            return { id, intercambio };
        }
    }
    return null;
}

function calcularValorPersonajes(personajes) {
    const { personajes: todosPersonajes } = cargarDatos();
    let valorTotal = 0;
    personajes.forEach(nombre => {
        const personaje = todosPersonajes.find(p => p.nombre === nombre);
        if (personaje) {
            valorTotal += personaje.precio;
        }
    });
    return valorTotal;
}

function generarResumenIntercambio(intercambio, db) {
    const { personajes: todosPersonajes } = cargarDatos();
    
    let resumen = `⚖️ *RESUMEN DEL INTERCAMBIO* ⚖️\n\n`;
    
    resumen += `👤 *${intercambio.usuario1}* da:\n`;
    if (intercambio.coins1 > 0) {
        resumen += `💰 Pandacoins: ${intercambio.coins1.toLocaleString()} 🐼\n`;
    }
    if (intercambio.personajes1.length > 0) {
        intercambio.personajes1.forEach((nombre, index) => {
            const personaje = todosPersonajes.find(p => p.nombre === nombre);
            const valor = personaje ? personaje.precio.toLocaleString() : 'Desconocido';
            resumen += `${index + 1}. ${nombre} (${valor} 🐼)\n`;
        });
    } else {
        resumen += `• Nada\n`;
    }
    
    resumen += `\n🔄\n\n`;
    
    resumen += `👤 *${intercambio.usuario2}* da:\n`;
    if (intercambio.coins2 > 0) {
        resumen += `💰 Pandacoins: ${intercambio.coins2.toLocaleString()} 🐼\n`;
    }
    if (intercambio.personajes2.length > 0) {
        intercambio.personajes2.forEach((nombre, index) => {
            const personaje = todosPersonajes.find(p => p.nombre === nombre);
            const valor = personaje ? personaje.precio.toLocaleString() : 'Desconocido';
            resumen += `${index + 1}. ${nombre} (${valor} 🐼)\n`;
        });
    } else {
        resumen += `• Nada\n`;
    }
    
    const valor1 = intercambio.coins1 + calcularValorPersonajes(intercambio.personajes1);
    const valor2 = intercambio.coins2 + calcularValorPersonajes(intercambio.personajes2);
    const diferencia = Math.abs(valor1 - valor2);
    const porcentaje = diferencia / Math.max(valor1, valor2);
    
    resumen += `\n📊 *ANÁLISIS:*\n`;
    resumen += `• Valor ${intercambio.usuario1}: ${valor1.toLocaleString()} 🐼\n`;
    resumen += `• Valor ${intercambio.usuario2}: ${valor2.toLocaleString()} 🐼\n`;
    resumen += `• Diferencia: ${diferencia.toLocaleString()} 🐼\n`;
    
    if (porcentaje <= 0.2) {
        resumen += `✅ *INTERCAMBIO JUSTO* (diferencia ≤ 20%)\n`;
    } else {
        resumen += `⚠️ *INTERCAMBIO DESIGUAL* (diferencia > 20%)\n`;
    }
    
    return resumen;
}

export async function run(sock, msg, args) {
    try {
        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderNumber = sender.split('@')[0];
        const isGroup = from.endsWith('@g.us');
        
        limpiarIntercambiosExpirados();
        
        const db = cargarDatabase();
        db.users = db.users || {};
        const user = db.users[sender] || {};
        
        user.personajes = user.personajes || [];
        if (user.personajes.length === 0) {
            await sock.sendMessage(from, {
                text: `📭 No tienes personajes para intercambiar.\n💡 Compra personajes primero con \`.buy random\``
            });
            return;
        }
        
        if (args.length >= 1 && args[0].includes('@')) {
            const intercambioExistente = obtenerIntercambioPorUsuario(senderNumber);
            if (intercambioExistente) {
                await sock.sendMessage(from, {
                    text: `⚠️ Ya tienes un intercambio activo.\n💡 Usa \`.intercambiar cancelar\` primero.`
                });
                return;
            }
            
            let objetivoJid = '';
            let objetivoNombre = '';
            
            if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                const menciones = msg.message.extendedTextMessage.contextInfo.mentionedJid;
                if (menciones.length > 0) {
                    objetivoJid = menciones[0];
                    objetivoNombre = objetivoJid.split('@')[0];
                }
            }
            
            if (!objetivoJid) {
                const input = args[0];
                if (input.includes('@')) {
                    const numero = input.replace('@', '').replace(/[^\d]/g, '');
                    if (numero) {
                        objetivoJid = numero + '@s.whatsapp.net';
                        objetivoNombre = numero;
                    }
                }
            }
            
            if (!objetivoJid) {
                await sock.sendMessage(from, {
                    text: `❌ Debes mencionar a un usuario válido.`
                });
                return;
            }
            
            if (objetivoJid === sender) {
                await sock.sendMessage(from, {
                    text: `❌ No puedes intercambiar contigo mismo.`
                });
                return;
            }
            
            if (!db.users[objetivoJid]) {
                await sock.sendMessage(from, {
                    text: `❌ El usuario no está registrado.`
                });
                return;
            }
            
            const objetivo = db.users[objetivoJid];
            objetivo.personajes = objetivo.personajes || [];
            if (objetivo.personajes.length === 0) {
                await sock.sendMessage(from, {
                    text: `❌ @${objetivoNombre} no tiene personajes.`,
                    mentions: isGroup ? [objetivoJid] : []
                });
                return;
            }
            
            const idIntercambio = `${senderNumber}_${objetivoNombre}_${Date.now()}`;
            intercambiosActivos[idIntercambio] = {
                usuario1: senderNumber,
                usuario2: objetivoNombre,
                jid1: sender,
                jid2: objetivoJid,
                grupo: from,
                personajes1: [],
                personajes2: [],
                coins1: 0,
                coins2: 0,
                estado: 'configurando',
                turno: senderNumber,
                creadoEn: Date.now()
            };
            
            await sock.sendMessage(from, {
                text: `🔄 *INTERCAMBIO INICIADO* 🔄\n\n👤 Usuario 1: @${senderNumber}\n👤 Usuario 2: @${objetivoNombre}\n\n📋 *Comandos:*\n• \`.intercambiar agregar <nombre>\`\n• \`.intercambiar coins <cantidad>\`\n• \`.intercambiar ver\`\n• \`.intercambiar listo\`\n• \`.intercambiar confirmar\`\n• \`.intercambiar cancelar\`\n\n⏰ Tiempo límite: 5 minutos`,
                mentions: isGroup ? [sender, objetivoJid] : []
            });
            
            return;
        }
        
        const intercambioActivo = obtenerIntercambioPorUsuario(senderNumber);
        
        if (!intercambioActivo) {
            await sock.sendMessage(from, {
                text: `🔄 *SISTEMA DE INTERCAMBIO* 🔄\n\n📝 *Uso:*\n\`.intercambiar @usuario\` - Iniciar\n\n📋 *Comandos:*\n• \`.intercambiar agregar <nombre>\`\n• \`.intercambiar quitar <número>\`\n• \`.intercambiar coins <cantidad>\`\n• \`.intercambiar ver\`\n• \`.intercambiar listo\`\n• \`.intercambiar confirmar\`\n• \`.intercambiar cancelar\`\n• \`.intercambiar mispersonajes\``
            });
            return;
        }
        
        const { id: idIntercambio, intercambio } = intercambioActivo;
        
        if (intercambio.grupo !== from) {
            await sock.sendMessage(from, {
                text: `⚠️ Este intercambio está activo en otro chat.`
            });
            return;
        }
        
        if (intercambio.estado === 'configurando' && intercambio.turno !== senderNumber) {
            const turnoDe = intercambio.turno === intercambio.usuario1 ? 
                `@${intercambio.usuario1}` : `@${intercambio.usuario2}`;
            
            await sock.sendMessage(from, {
                text: `⏳ Espera tu turno. Ahora le toca a ${turnoDe}.`,
                mentions: isGroup ? [
                    intercambio.turno === intercambio.usuario1 ? 
                    intercambio.jid1 : intercambio.jid2
                ] : []
            });
            return;
        }
        
        if (args.length === 0) {
            await sock.sendMessage(from, {
                text: generarResumenIntercambio(intercambio, db),
                mentions: isGroup ? [intercambio.jid1, intercambio.jid2] : []
            });
            return;
        }
        
        const subcomando = args[0].toLowerCase();
        
        if (subcomando === 'agregar' || subcomando === 'add') {
            if (args.length < 2) {
                await sock.sendMessage(from, {
                    text: `❌ Uso: \`.intercambiar agregar <nombre>\``
                });
                return;
            }
            
            const nombrePersonaje = args.slice(1).join(' ').trim();
            
            const userPersonajes = db.users[sender].personajes || [];
            if (!userPersonajes.includes(nombrePersonaje)) {
                await sock.sendMessage(from, {
                    text: `❌ No tienes el personaje *${nombrePersonaje}*.`
                });
                return;
            }
            
            const personajesUsuario = senderNumber === intercambio.usuario1 ? 
                intercambio.personajes1 : intercambio.personajes2;
            
            if (personajesUsuario.includes(nombrePersonaje)) {
                await sock.sendMessage(from, {
                    text: `❌ Ya agregaste *${nombrePersonaje}*.`
                });
                return;
            }
            
            if (senderNumber === intercambio.usuario1) {
                intercambio.personajes1.push(nombrePersonaje);
            } else {
                intercambio.personajes2.push(nombrePersonaje);
            }
            
            intercambio.turno = senderNumber === intercambio.usuario1 ? 
                intercambio.usuario2 : intercambio.usuario1;
            
            await sock.sendMessage(from, {
                text: `✅ Agregaste *${nombrePersonaje}* al intercambio.`
            });
            
        } else if (subcomando === 'quitar' || subcomando === 'remove') {
            if (args.length < 2) {
                await sock.sendMessage(from, {
                    text: `❌ Uso: \`.intercambiar quitar <número>\``
                });
                return;
            }
            
            const indice = parseInt(args[1]) - 1;
            let personajesUsuario = senderNumber === intercambio.usuario1 ? 
                intercambio.personajes1 : intercambio.personajes2;
            
            if (indice >= 0 && indice < personajesUsuario.length) {
                const removido = personajesUsuario.splice(indice, 1)[0];
                
                intercambio.turno = senderNumber === intercambio.usuario1 ? 
                    intercambio.usuario2 : intercambio.usuario1;
                
                await sock.sendMessage(from, {
                    text: `✅ Quitaste *${removido}* del intercambio.`
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Número inválido.`
                });
            }
            
        } else if (subcomando === 'coins' || subcomando === 'pandacoins') {
            if (args.length < 2) {
                await sock.sendMessage(from, {
                    text: `❌ Uso: \`.intercambiar coins <cantidad>\``
                });
                return;
            }
            
            const cantidad = parseInt(args[1]);
            if (isNaN(cantidad) || cantidad <= 0) {
                await sock.sendMessage(from, {
                    text: `❌ Cantidad inválida.`
                });
                return;
            }
            
            if (user.pandacoins < cantidad) {
                await sock.sendMessage(from, {
                    text: `❌ No tienes suficientes pandacoins.`
                });
                return;
            }
            
            if (senderNumber === intercambio.usuario1) {
                intercambio.coins1 += cantidad;
            } else {
                intercambio.coins2 += cantidad;
            }
            
            intercambio.turno = senderNumber === intercambio.usuario1 ? 
                intercambio.usuario2 : intercambio.usuario1;
            
            await sock.sendMessage(from, {
                text: `✅ Agregaste ${cantidad.toLocaleString()} 🐼 al intercambio.`
            });
            
        } else if (subcomando === 'ver' || subcomando === 'view') {
            await sock.sendMessage(from, {
                text: generarResumenIntercambio(intercambio, db),
                mentions: isGroup ? [intercambio.jid1, intercambio.jid2] : []
            });
            
        } else if (subcomando === 'listo' || subcomando === 'ready') {
            if (intercambio.estado === 'configurando') {
                intercambio.estado = 'revisando';
                
                await sock.sendMessage(from, {
                    text: `✅ @${senderNumber} está listo.\n💡 @${senderNumber === intercambio.usuario1 ? intercambio.usuario2 : intercambio.usuario1} debe usar \`.intercambiar listo\` también.`,
                    mentions: isGroup ? [
                        senderNumber === intercambio.usuario1 ? 
                        intercambio.jid2 : intercambio.jid1
                    ] : []
                });
            } else if (intercambio.estado === 'revisando') {
                intercambio.estado = 'confirmando';
                
                await sock.sendMessage(from, {
                    text: `🎉 ¡Ambos están listos!\n\n${generarResumenIntercambio(intercambio, db)}\n\n⚠️ *ATENCIÓN:* Esta acción es irreversible.\n✅ Confirmar: \`.intercambiar confirmar\`\n❌ Cancelar: \`.intercambiar cancelar\``,
                    mentions: isGroup ? [intercambio.jid1, intercambio.jid2] : []
                });
            }
            
        } else if (subcomando === 'confirmar' || subcomando === 'confirm') {
            if (intercambio.estado !== 'confirmando') {
                await sock.sendMessage(from, {
                    text: `❌ Ambos deben estar listos primero.`
                });
                return;
            }
            
            const usuario1 = db.users[intercambio.jid1];
            const usuario2 = db.users[intercambio.jid2];
            
            for (const personaje of intercambio.personajes1) {
                if (!usuario1.personajes.includes(personaje)) {
                    await sock.sendMessage(from, {
                        text: `❌ @${intercambio.usuario1} ya no tiene *${personaje}*.`,
                        mentions: isGroup ? [intercambio.jid1] : []
                    });
                    return;
                }
            }
            
            for (const personaje of intercambio.personajes2) {
                if (!usuario2.personajes.includes(personaje)) {
                    await sock.sendMessage(from, {
                        text: `❌ @${intercambio.usuario2} ya no tiene *${personaje}*.`,
                        mentions: isGroup ? [intercambio.jid2] : []
                    });
                    return;
                }
            }
            
            if (usuario1.pandacoins < intercambio.coins1) {
                await sock.sendMessage(from, {
                    text: `❌ @${intercambio.usuario1} no tiene suficientes pandacoins.`,
                    mentions: isGroup ? [intercambio.jid1] : []
                });
                return;
            }
            
            if (usuario2.pandacoins < intercambio.coins2) {
                await sock.sendMessage(from, {
                    text: `❌ @${intercambio.usuario2} no tiene suficientes pandacoins.`,
                    mentions: isGroup ? [intercambio.jid2] : []
                });
                return;
            }
            
            for (const personaje of intercambio.personajes1) {
                const index = usuario1.personajes.indexOf(personaje);
                if (index > -1) {
                    usuario1.personajes.splice(index, 1);
                    usuario2.personajes.push(personaje);
                }
            }
            
            for (const personaje of intercambio.personajes2) {
                const index = usuario2.personajes.indexOf(personaje);
                if (index > -1) {
                    usuario2.personajes.splice(index, 1);
                    usuario1.personajes.push(personaje);
                }
            }
            
            usuario1.pandacoins -= intercambio.coins1;
            usuario2.pandacoins += intercambio.coins1;
            
            usuario2.pandacoins -= intercambio.coins2;
            usuario1.pandacoins += intercambio.coins2;
            
            guardarDatabase(db);
            
            delete intercambiosActivos[idIntercambio];
            
            let mensajeExito = `🎉 *¡INTERCAMBIO COMPLETADO!* 🎉\n\n`;
            
            if (intercambio.personajes1.length > 0) {
                mensajeExito += `👤 @${intercambio.usuario1} → @${intercambio.usuario2}:\n`;
                intercambio.personajes1.forEach((p, i) => {
                    mensajeExito += `  ${i + 1}. ${p}\n`;
                });
                mensajeExito += `\n`;
            }
            
            if (intercambio.personajes2.length > 0) {
                mensajeExito += `👤 @${intercambio.usuario2} → @${intercambio.usuario1}:\n`;
                intercambio.personajes2.forEach((p, i) => {
                    mensajeExito += `  ${i + 1}. ${p}\n`;
                });
                mensajeExito += `\n`;
            }
            
            if (intercambio.coins1 > 0) {
                mensajeExito += `💰 @${intercambio.usuario1} → @${intercambio.usuario2}: ${intercambio.coins1.toLocaleString()} 🐼\n`;
            }
            
            if (intercambio.coins2 > 0) {
                mensajeExito += `💰 @${intercambio.usuario2} → @${intercambio.usuario1}: ${intercambio.coins2.toLocaleString()} 🐼\n`;
            }
            
            mensajeExito += `\n📊 *Nuevos saldos:*\n`;
            mensajeExito += `• @${intercambio.usuario1}: ${usuario1.pandacoins.toLocaleString()} 🐼\n`;
            mensajeExito += `• @${intercambio.usuario2}: ${usuario2.pandacoins.toLocaleString()} 🐼\n\n`;
            mensajeExito += `✨ ¡Intercambio exitoso!`;
            
            await sock.sendMessage(from, {
                text: mensajeExito,
                mentions: isGroup ? [intercambio.jid1, intercambio.jid2] : []
            });
            
        } else if (subcomando === 'cancelar' || subcomando === 'cancel') {
            delete intercambiosActivos[idIntercambio];
            
            await sock.sendMessage(from, {
                text: `❌ Intercambio cancelado por @${senderNumber}.`,
                mentions: isGroup ? [sender] : []
            });
            
        } else if (subcomando === 'mispersonajes' || subcomando === 'mycharacters') {
            const misPersonajes = db.users[sender].personajes || [];
            const { personajes: todosPersonajes } = cargarDatos();
            
            if (misPersonajes.length === 0) {
                await sock.sendMessage(from, {
                    text: `📭 No tienes personajes.`
                });
                return;
            }
            
            let mensajePersonajes = `📚 *TUS PERSONAJES (${misPersonajes.length})* 📚\n\n`;
            
            misPersonajes.forEach((nombre, index) => {
                const personaje = todosPersonajes.find(p => p.nombre === nombre);
                const valor = personaje ? personaje.precio.toLocaleString() : 'Desconocido';
                
                mensajePersonajes += `${index + 1}. *${nombre}*\n`;
                mensajePersonajes += `   💰 Valor: ${valor} 🐼\n\n`;
            });
            
            mensajePersonajes += `💡 *Para intercambiar:*\n`;
            mensajePersonajes += `\`.intercambiar agregar <nombre>\``;
            
            await sock.sendMessage(from, {
                text: mensajePersonajes
            });
            
        } else {
            await sock.sendMessage(from, {
                text: `❌ Comando no reconocido.`
            });
        }
        
    } catch (error) {
        console.error('❌ Error en intercambiar:', error);
        const from = msg.key.remoteJid;
        await sock.sendMessage(from, {
            text: `❌ Error en el sistema de intercambio: ${error.message}`
        });
    }
}