import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { actualizarMercado, obtenerPrecioMoneda } from '../lib/cryptoManager.js';

// Sistema de cooldown
const userCooldowns = new Map();
const HACK_COOLDOWN = 30 * 60 * 1000; // 30 minutos en milisegundos

function verificarCooldownHack(sender) {
    const now = Date.now();
    const lastHack = userCooldowns.get(sender);
    
    if (lastHack && (now - lastHack) < HACK_COOLDOWN) {
        const tiempoRestante = HACK_COOLDOWN - (now - lastHack);
        const minutosRestantes = Math.floor(tiempoRestante / 60000);
        const segundosRestantes = Math.floor((tiempoRestante % 60000) / 1000);
        return {
            enCooldown: true,
            minutos: minutosRestantes,
            segundos: segundosRestantes
        };
    }
    
    userCooldowns.set(sender, now);
    return { enCooldown: false };
}

export const command = 'hackear';
export const aliases = ['hack', 'ataque', 'jaqueca', 'jaquiar', 'jaguar', 'jaquear'];
export const description = 'Hackear la inversión de otro usuario para robar pandacoins';
export const category = 'economia';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    
    // Verificar cooldown
    const cooldownInfo = verificarCooldownHack(sender);
    if (cooldownInfo.enCooldown) {
        await sock.sendMessage(from, {
            text: `⏰ *EN COOLDOWN*\n━━━━━━━━━━━━━━━━\nDebes esperar antes de hackear nuevamente.\n⏰ Tiempo restante: ${cooldownInfo.minutos}m ${cooldownInfo.segundos}s\n━━━━━━━━━━━━━━━━\n⚠️ El hackeo tiene un cooldown de 30 minutos.`
        });
        return;
    }
    
    // Verificar si hay mención
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `🎯 *SISTEMA DE HACKEO* 🎯\n━━━━━━━━━━━━━━━━\nUso: .hackear @usuario\n\n💡 *Cómo funciona:*\n• Hackeas la inversión de otro usuario\n• Retiras el 10% de sus monedas invertidas y las conviertes a pandacoins\n• Si el objetivo no tiene inversión, pierdes el 10% de TUS pandacoins\n━━━━━━━━━━━━━━━━\n⚠️ *Cooldown:* 30 minutos\n⚔️ *Riesgo:* Alto\n💰 *Recompensa:* 10% de la inversión del objetivo`
        });
        return;
    }
    
    // Cargar base de datos
    const db = cargarDatabase();
    db.users = db.users || {};
    
    // Obtener información del atacante
    const atacante = db.users[sender] = db.users[sender] || {};
    atacante.pandacoins = atacante.pandacoins || 0;
    atacante.inversiones = atacante.inversiones || {};
    
    // Procesar mención
    let objetivoJid = '';
    let objetivoNombre = '';
    
    // Si es un mensaje con mención real
    if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        const menciones = msg.message.extendedTextMessage.contextInfo.mentionedJid;
        if (menciones.length > 0) {
            objetivoJid = menciones[0];
            objetivoNombre = objetivoJid.split('@')[0];
        }
    }
    
    // Si no hay mención directa, usar el argumento como número
    if (!objetivoJid) {
        const input = args[0];
        if (input.includes('@')) {
            const numero = input.replace('@', '').replace(/[^\d]/g, '');
            if (numero) {
                objetivoJid = numero + '@s.whatsapp.net';
                objetivoNombre = numero;
            }
        } else {
            const numeroLimpio = input.replace(/[^\d]/g, '');
            if (numeroLimpio) {
                objetivoJid = numeroLimpio + '@s.whatsapp.net';
                objetivoNombre = numeroLimpio;
            }
        }
    }
    
    if (!objetivoJid) {
        await sock.sendMessage(from, {
            text: `❌ *USUARIO INVÁLIDO*\n━━━━━━━━━━━━━━━━\nDebes mencionar a un usuario válido.\n💡 Ejemplo: .hackear @usuario`
        });
        userCooldowns.delete(sender);
        return;
    }
    
    // Verificar que no se está hackeando a sí mismo
    if (objetivoJid === sender) {
        await sock.sendMessage(from, {
            text: `❌ *ERROR DE HACKEO*\n━━━━━━━━━━━━━━━━\nNo puedes hackearte a ti mismo.\n━━━━━━━━━━━━━━━━\n💡 Intenta con otro objetivo: .hackear @usuario`
        });
        userCooldowns.delete(sender);
        return;
    }
    
    // Verificar que el objetivo existe en la base de datos
    if (!db.users[objetivoJid]) {
        await sock.sendMessage(from, {
            text: `❌ *USUARIO NO ENCONTRADO*\n━━━━━━━━━━━━━━━━\nEl usuario @${objetivoNombre} no está registrado en el sistema.\n💡 El objetivo debe haber usado el bot al menos una vez.`
        });
        userCooldowns.delete(sender);
        return;
    }
    
    const objetivo = db.users[objetivoJid];
    objetivo.pandacoins = objetivo.pandacoins || 0;
    objetivo.inversiones = objetivo.inversiones || {};
    
    // Mensaje de inicio del hackeo
    const mensajeHackeo = await sock.sendMessage(from, {
        text: `⚡ *INICIANDO HACKEO...* ⚡\n━━━━━━━━━━━━━━━━\n🎯 Objetivo: @${objetivoNombre}\n🕵️‍♂️ Atacante: @${sender.split('@')[0]}\n━━━━━━━━━━━━━━━━\n💻 Conectando a servidor...`,
        contextInfo: {
            mentionedJid: [objetivoJid, sender]
        }
    });
    
    // Simular proceso de hackeo
    const pasosHackeo = [
        { texto: '🔍 Escaneando red del objetivo...', delay: 1500 },
        { texto: '💻 Explotando vulnerabilidades...', delay: 2000 },
        { texto: '🔓 Bypasseando seguridad...', delay: 2500 },
        { texto: '💰 Accediendo a billetera digital...', delay: 2000 }
    ];
    
    for (const paso of pasosHackeo) {
        await new Promise(resolve => setTimeout(resolve, paso.delay));
        await sock.sendMessage(from, {
            text: paso.texto,
            edit: mensajeHackeo.key
        });
    }
    
    // Actualizar precios del mercado
    await actualizarMercado();
    
    // Encontrar la inversión más grande del objetivo para hackear
    let mejorInversion = null;
    let maxValor = 0;
    let totalInversiones = 0;
    
    // Calcular total de inversiones y encontrar la mejor
    for (const [monedaId, inversion] of Object.entries(objetivo.inversiones)) {
        if (inversion && inversion.cantidad > 0) {
            const precioInfo = await obtenerPrecioMoneda(monedaId);
            if (precioInfo) {
                const valorActual = inversion.cantidad * precioInfo.precioActual;
                totalInversiones += valorActual;
                
                if (valorActual > maxValor) {
                    maxValor = valorActual;
                    mejorInversion = {
                        monedaId,
                        monedaNombre: precioInfo.nombre,
                        emoji: precioInfo.color,
                        inversion,
                        precioInfo
                    };
                }
            }
        }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // CASO 1: El objetivo tiene inversiones ACTIVAS
    if (mejorInversion && maxValor > 0) {
        const { monedaId, monedaNombre, emoji, inversion, precioInfo } = mejorInversion;
        
        // Calcular 10% de las monedas de esa inversión
        const monedasARetirar = inversion.cantidad * 0.1;
        
        // Calcular valor actual de esas monedas
        const valorRetiro = monedasARetirar * precioInfo.precioActual;
        
        // Calcular inversión original proporcional
        const proporcion = monedasARetirar / inversion.cantidad;
        const inversionOriginal = inversion.inversionTotal * proporcion;
        const gananciaHackeo = valorRetiro - inversionOriginal;
        
        // RETIRAR DEL OBJETIVO (como .retirar)
        objetivo.inversiones[monedaId].cantidad -= monedasARetirar;
        objetivo.inversiones[monedaId].inversionTotal -= inversionOriginal;
        
        // Si quedan 0 o menos monedas, limpiar la inversión
        if (objetivo.inversiones[monedaId].cantidad <= 0) {
            objetivo.inversiones[monedaId].cantidad = 0;
            objetivo.inversiones[monedaId].inversionTotal = 0;
        }
        
        // TRANSFERIR AL ATACANTE (el atacante recibe las pandacoins)
        atacante.pandacoins += valorRetiro;
        
        guardarDatabase(db);
        
        // Mensaje de éxito del hackeo
        let mensajeExito = `✅ *HACKEO EXITOSO!* ✅\n━━━━━━━━━━━━━━━━\n`;
        mensajeExito += `🎯 Objetivo: @${objetivoNombre}\n`;
        mensajeExito += `🕵️‍♂️ Atacante: @${sender.split('@')[0]}\n\n`;
        mensajeExito += `💎 *INVERSIÓN HACKEADA:* ${emoji} ${monedaNombre}\n`;
        mensajeExito += `🪙 *Monedas retiradas:* ${monedasARetirar.toFixed(4)}\n`;
        mensajeExito += `💰 *Valor robado:* ${valorRetiro.toLocaleString()} 🐼\n`;
        
        if (inversionOriginal > 0) {
            const porcentajeHackeo = (gananciaHackeo / inversionOriginal) * 100;
            mensajeExito += `📊 *Ganancia del hackeo:* ${gananciaHackeo >= 0 ? '+' : ''}${gananciaHackeo.toFixed(0)} 🐼 (${porcentajeHackeo >= 0 ? '+' : ''}${porcentajeHackeo.toFixed(2)}%)\n\n`;
        }
        
        mensajeExito += `💸 *CAMBIOS EN SALDOS:*\n`;
        mensajeExito += `🕵️‍♂️ Atacante: ${atacante.pandacoins.toLocaleString()} 🐼 (+${valorRetiro.toLocaleString()})\n`;
        mensajeExito += `🎯 Objetivo: ${objetivo.pandacoins.toLocaleString()} 🐼 (pérdida en inversión)\n\n`;
        
        mensajeExito += `📉 *INVERSIÓN OBJETIVO AHORA:*\n`;
        mensajeExito += `${emoji} ${monedaNombre}: ${objetivo.inversiones[monedaId].cantidad.toFixed(4)} monedas\n\n`;
        
        mensajeExito += `⚠️ *Cooldown activado:* 30 minutos\n`;
        mensajeExito += `⚡ *Próximo hackeo:* En 30 minutos`;
        
        await sock.sendMessage(from, {
            text: mensajeExito,
            contextInfo: {
                mentionedJid: [objetivoJid, sender]
            }
        });
        
        // Notificar al objetivo
        try {
            await sock.sendMessage(objetivoJid, {
                text: `🚨 *ALERTA DE SEGURIDAD CRÍTICA* 🚨\n━━━━━━━━━━━━━━━━\n¡TU INVERSIÓN HA SIDO HACKEADA!\n🕵️‍♂️ Atacante: @${sender.split('@')[0]}\n💎 Moneda hackeada: ${monedaNombre}\n🪙 Monedas robadas: ${monedasARetirar.toFixed(4)}\n💰 Valor robado: ${valorRetiro.toLocaleString()} 🐼\n📉 Tu inversión ahora: ${objetivo.inversiones[monedaId].cantidad.toFixed(4)} monedas\n━━━━━━━━━━━━━━━━\n⚠️ ¡REFUERZA TU SEGURIDAD INMEDIATAMENTE!`
            });
        } catch (error) {
            // Ignorar error
        }
        
        // Reacción de éxito
        await sock.sendMessage(from, {
            react: { text: '💰', key: msg.key }
        });
        
    } else {
        // CASO 2: El objetivo NO tiene inversiones ACTIVAS
        // Calcular 10% de los pandacoins del atacante
        const montoPerdido = Math.max(1, Math.floor(atacante.pandacoins * 0.1));
        
        // Quitar del atacante (puede quedar negativo)
        atacante.pandacoins -= montoPerdido;
        
        guardarDatabase(db);
        
        // Mensaje de fracaso del hackeo
        let mensajeFracaso = `🚨 *HACKEO FALLIDO!* 🚨\n━━━━━━━━━━━━━━━━\n`;
        mensajeFracaso += `🎯 Objetivo: @${objetivoNombre}\n`;
        mensajeFracaso += `🕵️‍♂️ Atacante: @${sender.split('@')[0]}\n\n`;
        mensajeFracaso += `👮 *TE RASTREARON LOS PACOS!*\n`;
        mensajeFracaso += `🚔 Llegaron a tu casa y te multaron\n`;
        
        if (montoPerdido > 0) {
            mensajeFracaso += `💰 *MULTA PAGADA:* ${montoPerdido.toLocaleString()} 🐼\n\n`;
            mensajeExito += `💸 *CAMBIOS EN SALDOS:*\n`;
            mensajeExito += `🕵️‍♂️ Atacante: ${atacante.pandacoins.toLocaleString()} 🐼 (-${montoPerdido.toLocaleString()})\n\n`;
        }
        
        mensajeFracaso += `📝 *RAZÓN DEL FRACASO:*\n`;
        mensajeFracaso += `🎯 El objetivo no tiene inversiones ACTIVAS\n`;
        mensajeFracaso += `💼 Inversiones deben tener cantidad > 0\n\n`;
        mensajeFracaso += `⚠️ *Cooldown activado:* 30 minutos\n`;
        mensajeFracaso += `⚡ *Próximo intento:* En 30 minutos`;
        
        await sock.sendMessage(from, {
            text: mensajeFracaso,
            contextInfo: {
                mentionedJid: [objetivoJid, sender]
            }
        });
        
        // Reacción de fracaso
        await sock.sendMessage(from, {
            react: { text: '👮', key: msg.key }
        });
    }
    
    // Limpiar cooldowns viejos
    setTimeout(() => {
        const now = Date.now();
        for (const [key, timestamp] of userCooldowns.entries()) {
            if (now - timestamp > HACK_COOLDOWN * 2) {
                userCooldowns.delete(key);
            }
        }
    }, 3600000);
}
