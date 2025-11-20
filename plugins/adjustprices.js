import fs from 'fs';
import { ownerNumber } from '../config.js';

export const command = 'adjustprices';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
    
    if (!ownerNumber.includes(`+${sender}`)) {
        await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
        return;
    }

    try {
        const configPath = './data/priceconfig.json';
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        const personajesPath = './data/personajes.json';
        const personajesData = JSON.parse(fs.readFileSync(personajesPath, 'utf8'));
        
        const accion = args[0]?.toLowerCase();

        if (!accion) {
            // MOSTRAR AYUDA
            await sock.sendMessage(from, {
                text: `💰 *SISTEMA DE AJUSTE DE PRECIOS* 💰\n\n📝 *Usos disponibles:*\n• .adjustprices apply - Aplicar ajuste actual\n• .adjustprices preview - Vista previa (sin aplicar)\n• .adjustprices config - Ver configuración\n• .adjustprices set multi <valor> - Cambiar multiplicador\n• .adjustprices set min <valor> - Cambiar precio mínimo\n• .adjustprices toggle - Activar/desactivar\n• .adjustprices addexception <nombre> - Agregar excepción\n• .adjustprices removeexception <nombre> - Eliminar excepción\n• .adjustprices resetexceptions - Limpiar excepciones\n\n🔒 *Seguridad:* Multiplicadores > x5 requieren confirmación`
            });
            return;
        }

        if (accion === 'apply') {
            // VERIFICACIÓN DE SEGURIDAD PARA MULTIPLICADORES ALTOS
            if (config.multiplicadorGeneral > 5) {
                await sock.sendMessage(from, {
                    text: `⚠️ *ADVERTENCIA DE SEGURIDAD*\n\nEl multiplicador es muy alto (x${config.multiplicadorGeneral}).\n\n¿Estás seguro de que quieres multiplicar los precios x${config.multiplicadorGeneral}?\n\n✅ Confirma con: .adjustprices confirm\n\n🔍 Usa .adjustprices preview para ver qué se modificaría.`
                });
                return;
            }

            if (!config.activo) {
                await sock.sendMessage(from, {
                    text: '❌ El ajuste de precios está desactivado en la configuración.'
                });
                return;
            }

            await aplicarAjuste(sock, from, config, personajesData, personajesPath, configPath);

        } else if (accion === 'confirm') {
            // CONFIRMACIÓN PARA MULTIPLICADORES ALTOS
            if (!config.activo) {
                await sock.sendMessage(from, { text: '❌ El sistema está desactivado.' });
                return;
            }

            await aplicarAjuste(sock, from, config, personajesData, personajesPath, configPath, true);

        } else if (accion === 'config') {
            // MOSTRAR CONFIGURACIÓN ACTUAL
            await sock.sendMessage(from, {
                text: `⚙️ *Configuración Actual de Precios*\n\n📈 *Multiplicador:* x${config.multiplicadorGeneral}\n💰 *Precio mínimo:* ${config.precioMinimoParaMultiplicar.toLocaleString()} 🐼\n🔧 *Estado:* ${config.activo ? '✅ Activado' : '❌ Desactivado'}\n📅 *Última actualización:* ${new Date(config.ultimaActualizacion).toLocaleString()}\n\n🚫 *Excepciones (${config.excepciones.length}):*\n${config.excepciones.length > 0 ? config.excepciones.map(e => `• ${e}`).join('\n') : 'Ninguna'}\n\n💡 *Usa:*\n• .adjustprices set multi <valor>\n• .adjustprices set min <valor>\n• .adjustprices toggle`
            });

        } else if (accion === 'set') {
            // CONFIGURAR VALORES
            const tipo = args[1]?.toLowerCase();
            const valor = parseFloat(args[2]);

            if (!tipo || isNaN(valor)) {
                await sock.sendMessage(from, {
                    text: '❌ Uso: .adjustprices set <multi|min> <valor>\n\n📝 Ejemplos:\n• .adjustprices set multi 2\n• .adjustprices set min 500000\n• .adjustprices set multi 0.5 (para reducir precios)'
                });
                return;
            }

            if (tipo === 'multi') {
                if (valor <= 0) {
                    await sock.sendMessage(from, { text: '❌ El multiplicador debe ser mayor a 0.' });
                    return;
                }
                config.multiplicadorGeneral = valor;
                await sock.sendMessage(from, { 
                    text: `✅ Multiplicador actualizado a: *x${valor}*` 
                });
            } else if (tipo === 'min') {
                if (valor < 0) {
                    await sock.sendMessage(from, { text: '❌ El precio mínimo no puede ser negativo.' });
                    return;
                }
                config.precioMinimoParaMultiplicar = valor;
                await sock.sendMessage(from, { 
                    text: `✅ Precio mínimo actualizado a: *${valor.toLocaleString()}* 🐼` 
                });
            } else {
                await sock.sendMessage(from, { 
                    text: '❌ Tipo inválido. Usa: multi | min' 
                });
                return;
            }

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        } else if (accion === 'toggle') {
            // ACTIVAR/DESACTIVAR
            config.activo = !config.activo;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            await sock.sendMessage(from, { 
                text: `✅ Ajuste de precios *${config.activo ? 'activado' : 'desactivado'}*` 
            });

        } else if (accion === 'addexception') {
            // AGREGAR EXCEPCIÓN
            const nombreExcepcion = args.slice(1).join(' ');
            if (!nombreExcepcion) {
                await sock.sendMessage(from, { 
                    text: '❌ Uso: .adjustprices addexception <nombre personaje>' 
                });
                return;
            }

            if (!config.excepciones.includes(nombreExcepcion)) {
                config.excepciones.push(nombreExcepcion);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(from, { 
                    text: `✅ *${nombreExcepcion}* agregado a las excepciones\n\n📋 Total excepciones: ${config.excepciones.length}` 
                });
            } else {
                await sock.sendMessage(from, { 
                    text: `❌ *${nombreExcepcion}* ya está en las excepciones` 
                });
            }

        } else if (accion === 'removeexception') {
            // ELIMINAR EXCEPCIÓN
            const nombreExcepcion = args.slice(1).join(' ');
            if (!nombreExcepcion) {
                await sock.sendMessage(from, { 
                    text: '❌ Uso: .adjustprices removeexception <nombre personaje>' 
                });
                return;
            }

            const index = config.excepciones.indexOf(nombreExcepcion);
            if (index !== -1) {
                config.excepciones.splice(index, 1);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                await sock.sendMessage(from, { 
                    text: `✅ *${nombreExcepcion}* eliminado de las excepciones\n\n📋 Total excepciones: ${config.excepciones.length}` 
                });
            } else {
                await sock.sendMessage(from, { 
                    text: `❌ *${nombreExcepcion}* no está en las excepciones` 
                });
            }

        } else if (accion === 'resetexceptions') {
            // LIMPIAR TODAS LAS EXCEPCIONES
            config.excepciones = [];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            await sock.sendMessage(from, { 
                text: '✅ Todas las excepciones han sido eliminadas.' 
            });

        } else if (accion === 'preview') {
            // VISTA PREVIA (sin aplicar)
            let mensaje = `👁️ *Vista Previa - Ajuste de Precios*\n\n`;
            mensaje += `📈 *Multiplicador:* x${config.multiplicadorGeneral}\n`;
            mensaje += `💰 *Precio mínimo:* ${config.precioMinimoParaMultiplicar.toLocaleString()} 🐼\n`;
            mensaje += `🔧 *Estado:* ${config.activo ? '✅ Activado' : '❌ Desactivado'}\n\n`;
            
            let personajesModificados = 0;
            let precioTotalAntes = 0;
            let precioTotalDespues = 0;
            const ejemplos = [];

            for (const personaje of personajesData.characters) {
                // Saltar excepciones
                if (config.excepciones.includes(personaje.nombre)) {
                    continue;
                }

                // SOLO modificar personajes que cuestan MENOS del límite
                if (personaje.precio < config.precioMinimoParaMultiplicar) {
                    const nuevoPrecio = Math.floor(personaje.precio * config.multiplicadorGeneral);
                    
                    if (ejemplos.length < 8) {
                        ejemplos.push({
                            nombre: personaje.nombre,
                            antes: personaje.precio,
                            despues: nuevoPrecio
                        });
                    }
                    
                    personajesModificados++;
                    precioTotalAntes += personaje.precio;
                    precioTotalDespues += nuevoPrecio;
                }
            }

            if (personajesModificados === 0) {
                mensaje += `❌ *No hay personajes que cumplan los criterios.*\n\n`;
                mensaje += `💡 Todos los personajes cuestan ${config.precioMinimoParaMultiplicar.toLocaleString()} 🐼 o más, o están en excepciones.`;
            } else {
                mensaje += `*Ejemplos de cambios:*\n`;
                ejemplos.forEach(ej => {
                    const flecha = ej.despues > ej.antes ? '↗️' : (ej.despues < ej.antes ? '↘️' : '➡️');
                    mensaje += `• ${ej.nombre}: ${ej.antes.toLocaleString()} → ${ej.despues.toLocaleString()} 🐼 ${flecha}\n`;
                });

                if (personajesModificados > 8) {
                    mensaje += `\n... y ${personajesModificados - 8} personajes más\n`;
                }

                mensaje += `\n📊 *Resumen:*\n`;
                mensaje += `• Personajes a modificar: ${personajesModificados}\n`;
                mensaje += `• Valor total antes: ${precioTotalAntes.toLocaleString()} 🐼\n`;
                mensaje += `• Valor total después: ${precioTotalDespues.toLocaleString()} 🐼\n`;
                mensaje += `• Incremento total: +${(precioTotalDespues - precioTotalAntes).toLocaleString()} 🐼\n`;
                
                if (config.multiplicadorGeneral > 5) {
                    mensaje += `\n⚠️ *Multiplicador alto* - Requiere .adjustprices confirm`;
                } else {
                    mensaje += `\n✅ *Listo para aplicar* - Usa .adjustprices apply`;
                }
            }

            await sock.sendMessage(from, { text: mensaje });

        } else {
            await sock.sendMessage(from, {
                text: `❌ Comando no reconocido: ${accion}\n\n💡 Usa .adjustprices sin argumentos para ver la ayuda.`
            });
        }

    } catch (error) {
        console.error('Error en adjustprices:', error);
        await sock.sendMessage(from, {
            text: '❌ Error al procesar el comando.'
        });
    }
}

// FUNCIÓN PARA APLICAR AJUSTE (REUTILIZABLE)
async function aplicarAjuste(sock, from, config, personajesData, personajesPath, configPath, confirmado = false) {
    let personajesModificados = 0;
    let precioTotalAntes = 0;
    let precioTotalDespues = 0;
    const modificados = [];

    for (const personaje of personajesData.characters) {
        // Saltar excepciones
        if (config.excepciones.includes(personaje.nombre)) {
            continue;
        }

        // ✅ SOLO modificar personajes que cuestan MENOS del límite
        if (personaje.precio < config.precioMinimoParaMultiplicar) {
            const precioOriginal = personaje.precio;
            const nuevoPrecio = Math.floor(precioOriginal * config.multiplicadorGeneral);
            
            precioTotalAntes += precioOriginal;
            personaje.precio = nuevoPrecio;
            precioTotalDespues += nuevoPrecio;
            personajesModificados++;
            
            if (modificados.length < 5) {
                modificados.push(`${personaje.nombre}: ${precioOriginal.toLocaleString()} → ${nuevoPrecio.toLocaleString()} 🐼`);
            }
        }
    }

    // Guardar cambios
    fs.writeFileSync(personajesPath, JSON.stringify(personajesData, null, 2));
    config.ultimaActualizacion = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    let mensaje = `✅ *Ajuste de precios ${confirmado ? 'CONFIRMADO' : 'APLICADO'}!*\n\n`;
    mensaje += `📊 *Estadísticas:*\n`;
    mensaje += `• Personajes modificados: ${personajesModificados}\n`;
    mensaje += `• Multiplicador: x${config.multiplicadorGeneral}\n`;
    mensaje += `• Límite aplicado: < ${config.precioMinimoParaMultiplicar.toLocaleString()} 🐼\n`;
    mensaje += `• Incremento total: +${(precioTotalDespues - precioTotalAntes).toLocaleString()} 🐼\n`;

    if (modificados.length > 0) {
        mensaje += `\n📝 *Ejemplos de cambios:*\n${modificados.join('\n')}`;
    }

    if (personajesModificados === 0) {
        mensaje += `\n💡 *No se modificó ningún personaje.*\n`;
        mensaje += `Todos los personajes cuestan ${config.precioMinimoParaMultiplicar.toLocaleString()} 🐼 o más, o están en excepciones.`;
    }

    mensaje += `\n\n🔄 *Actualizado:* ${new Date().toLocaleString()}`;

    await sock.sendMessage(from, { text: mensaje });
}
