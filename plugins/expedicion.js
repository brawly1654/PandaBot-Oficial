import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { cargarDatos } from '../lib/cacheManager.js';

export const command = 'expedicion';
export const aliases = ['mision', 'mission'];

// Configuración de expediciones por rareza (actualizada)
const CONFIG_EXPEDICION = {
    duraciones: {
        'común': 1 * 60 * 60 * 1000,           // 1 hora
        'raro': 2 * 60 * 60 * 1000,            // 2 horas
        'épico': 3 * 60 * 60 * 1000,           // 4 horas
        'mítico': 3 * 60 * 60 * 1000,          // 8 horas
        'legendario': 4 * 60 * 60 * 1000,     // 12 horas
        'Ultra-Legendario': 4 * 60 * 60 * 1000, // 18 horas
        'Secret': 6 * 60 * 60 * 1000,         // 24 horas
        'OG': 6 * 60 * 60 * 1000,             // 36 horas
        'custom': 6 * 60 * 60 * 1000           // 6 horas (por defecto)
    },
    recompensas: {
        'común': { monedas: 500, probabilidadEfecto: 0.01, probabilidadItem: 0.005 },
        'raro': { monedas: 1000, probabilidadEfecto: 0.03, probabilidadItem: 0.01 },
        'épico': { monedas: 1500, probabilidadEfecto: 0.08, probabilidadItem: 0.02 },
        'mítico': { monedas: 2000, probabilidadEfecto: 0.15, probabilidadItem: 0.04 },
        'legendario': { monedas: 2500, probabilidadEfecto: 0.25, probabilidadItem: 0.08 },
        'Ultra-Legendario': { monedas: 3000, probabilidadEfecto: 0.35, probabilidadItem: 0.15 },
        'Secret': { monedas: 3500, probabilidadEfecto: 0.50, probabilidadItem: 0.25 },
        'OG': { monedas: 4000, probabilidadEfecto: 0.75, probabilidadItem: 0.40 },
        'GOD': { monedas: 4500, probabilidadEfecto: 0.8, probabilidadItem: 0.40 },
        'custom': { monedas: 3500, probabilidadEfecto: 0.05, probabilidadItem: 0.02 }
    },
    itemsEspeciales: {
        'común': ['Tickets de Circo', 'Fragmentos Comunes'],
        'raro': ['Esferas de Poder', 'Semillas de Efecto'],
        'épico': ['Cristales Épicos', 'Llaves Místicas'],
        'mítico': ['Reliquias Antiguas', 'Esencia de Dios'],
        'legendario': ['Fragmentos Legendarios', 'Lágrimas de Fénix'],
        'Ultra-Legendario': ['Núcleos Cósmicos', 'Esferas del Dragón'],
        'Secret': ['Artefactos Perdidos', 'Secretos Ancestrales'],
        'OG': ['Reliquias Primigenias', 'Esencia OG'],
        'GOD': ['Gema Extraña']
    }
};

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const db = cargarDatabase();
    db.users = db.users || {};
    const user = db.users[sender] = db.users[sender] || {};
    
    // Inicializar sistema de expediciones
    user.expediciones = user.expediciones || {
        activas: [],
        completadas: 0,
        tiempoTotal: 0,
        itemsObtenidos: {}
    };

    if (args.length === 0) {
        await mostrarAyuda(sock, from, user);
        return;
    }

    const accion = args[0].toLowerCase();

    if (accion === 'enviar') {
        await enviarExpedicion(sock, from, msg, args.slice(1), user, db);
    } else if (accion === 'estado') {
        await mostrarEstado(sock, from, user);
    } else if (accion === 'reclamar') {
        await reclamarExpedicion(sock, from, user, db);
    } else if (accion === 'cancelar') {
        await cancelarExpedicion(sock, from, user, db);
    } else if (accion === 'items') {
        await mostrarItems(sock, from, user);
    } else {
        // Si no es una acción, asumimos que es enviar expedición directamente
        await enviarExpedicion(sock, from, msg, args, user, db);
    }
}

async function mostrarAyuda(sock, from, user) {
    const expedicionesActivas = user.expediciones.activas.length;
    const expedicionesCompletadas = user.expediciones.completadas || 0;
    const totalItems = Object.values(user.expediciones.itemsObtenidos || {}).reduce((a, b) => a + b, 0);

    let mensaje = `🌌 *SISTEMA DE EXPEDICIONES ESPACIALES* 🌌\n\n`;
    mensaje += `📊 *Tus Estadísticas:*\n`;
    mensaje += `• Expediciones activas: ${expedicionesActivas}/3\n`;
    mensaje += `• Expediciones completadas: ${expedicionesCompletadas}\n`;
    mensaje += `• Items especiales: ${totalItems}\n\n`;
    
    mensaje += `🎯 *Comandos disponibles:*\n`;
    mensaje += `• .expedicion <personaje> - Enviar a expedición\n`;
    mensaje += `• .expedicion estado - Ver expediciones activas\n`;
    mensaje += `• .expedicion reclamar - Reclamar recompensas\n`;
    mensaje += `• .expedicion cancelar - Cancelar expedición\n`;
    mensaje += `• .expedicion items - Ver items obtenidos\n\n`;
    
    mensaje += `⏰ *Duración por rareza:*\n`;
    mensaje += `• común: 1 hora\n`;
    mensaje += `• raro: 2 horas\n`;
    mensaje += `• épico: 3 horas\n`;
    mensaje += `• mítico: 3 horas\n`;
    mensaje += `• legendario: 4 horas\n`;
    mensaje += `• Ultra-Legendario: 4 horas\n`;
    mensaje += `• Secret: 6 horas\n`;
    mensaje += `• OG: 6 horas\n\n`;
    mensaje += `• GOD: 6 horas\n\n`;
    
    mensaje += `💎 *Recompensas por rareza:*\n`;
    mensaje += `• común: 500 🐼\n`;
    mensaje += `• raro: 1.000 🐼\n`;
    mensaje += `• épico: 1.500 🐼\n`;
    mensaje += `• mítico: 2.000 🐼\n`;
    mensaje += `• legendario: 2.500 🐼\n`;
    mensaje += `• Ultra-Legendario: 3.000 🐼\n`;
    mensaje += `• Secret: 3.500 🐼\n`;
    mensaje += `• OG: 4.000 🐼\n\n`;
    mensaje += `• GOD: 4.500 🐼\n\n`;

    mensaje += `💡 *Consejo:* Envía personajes más raros para mejores recompensas y items especiales!`;

    await sock.sendMessage(from, { text: mensaje });
}

async function enviarExpedicion(sock, from, msg, args, user, db) {
    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: '❌ Debes especificar un personaje.\n\n💡 Ejemplo: .expedicion Goku'
        });
        return;
    }

    const nombrePersonaje = args.join(' ').trim();
    
    // Verificar límite de expediciones activas
    if (user.expediciones.activas.length >= 5) {
        await sock.sendMessage(from, {
            text: `❌ Límite alcanzado. Tienes 3 expediciones activas.\n\n💡 Usa .expedicion estado para verlas o .expedicion reclamar para completarlas.`
        });
        return;
    }

    // Verificar que el usuario tiene el personaje
    user.personajes = user.personajes || [];
    const tienePersonaje = user.personajes.some(p => p.toLowerCase() === nombrePersonaje.toLowerCase());
    
    if (!tienePersonaje) {
        await sock.sendMessage(from, {
            text: `❌ No tienes al personaje *${nombrePersonaje}* en tu inventario.\n\n💡 Usa .misps para ver tus personajes disponibles.`
        });
        return;
    }

    // Cargar datos del personaje
    const { personajes } = cargarDatos();
    const personaje = personajes.find(p => p.nombre.toLowerCase() === nombrePersonaje.toLowerCase());
    
    if (!personaje) {
        await sock.sendMessage(from, {
            text: `❌ El personaje *${nombrePersonaje}* no existe en la base de datos.`
        });
        return;
    }

    // Verificar que el personaje no esté en expedición
    const yaEnExpedicion = user.expediciones.activas.some(exp => exp.personaje.toLowerCase() === nombrePersonaje.toLowerCase());
    if (yaEnExpedicion) {
        await sock.sendMessage(from, {
            text: `❌ *${nombrePersonaje}* ya está en una expedición.\n\n💡 Usa .expedicion estado para ver expediciones activas.`
        });
        return;
    }

    // Calcular duración basada en rareza
    const calidad = personaje.calidad || 'custom';
    const duracion = CONFIG_EXPEDICION.duraciones[calidad] || CONFIG_EXPEDICION.duraciones.custom;
    const recompensaBase = CONFIG_EXPEDICION.recompensas[calidad] || CONFIG_EXPEDICION.recompensas.custom;

    // Crear expedición
    const expedicion = {
        id: Date.now().toString(),
        personaje: personaje.nombre,
        calidad: calidad,
        inicio: Date.now(),
        fin: Date.now() + duracion,
        duracion: duracion,
        recompensa: recompensaBase
    };

    user.expediciones.activas.push(expedicion);

    guardarDatabase(db);

    // Formatear tiempo restante
    const horas = Math.floor(duracion / (60 * 60 * 1000));
    const minutos = Math.floor((duracion % (60 * 60 * 1000)) / (60 * 1000));

    await sock.sendMessage(from, {
        text: `🚀 *¡EXPEDICIÓN ENVIADA!* 🚀\n\n👤 *Personaje:* ${personaje.nombre}\n🎯 *Calidad:* ${calidad}\n⏰ *Duración:* ${horas}h ${minutos}m\n💰 *Recompensa base:* ${recompensaBase.monedas.toLocaleString()} 🐼\n🎁 *Posibles items:* ${CONFIG_EXPEDICION.itemsEspeciales[calidad] ? CONFIG_EXPEDICION.itemsEspeciales[calidad].join(', ') : 'Ninguno'}\n\n🌌 *Expediciones activas:* ${user.expediciones.activas.length}/5\n\n💡 Usa .expedicion estado para seguir el progreso.`
    });
}

async function mostrarEstado(sock, from, user) {
    const ahora = Date.now();
    const expedicionesActivas = user.expediciones.activas;

    if (expedicionesActivas.length === 0) {
        await sock.sendMessage(from, {
            text: `📭 No tienes expediciones activas.\n\n💡 Envía personajes con: .expedicion <nombre personaje>`
        });
        return;
    }

    let mensaje = `📊 *ESTADO DE EXPEDICIONES* 📊\n\n`;
    
    expedicionesActivas.forEach((exp, index) => {
        const tiempoRestante = exp.fin - ahora;
        const completado = tiempoRestante <= 0;
        
        if (completado) {
            mensaje += `✅ *${exp.personaje}* (${exp.calidad})\n`;
            mensaje += `🎯 *LISTO PARA RECLAMAR!*\n`;
            mensaje += `💰 Recompensa: ${exp.recompensa.monedas.toLocaleString()} 🐼\n\n`;
        } else {
            const horas = Math.floor(tiempoRestante / (60 * 60 * 1000));
            const minutos = Math.floor((tiempoRestante % (60 * 60 * 1000)) / (60 * 1000));
            
            mensaje += `⏳ *${exp.personaje}* (${exp.calidad})\n`;
            mensaje += `🕒 Tiempo restante: ${horas}h ${minutos}m\n`;
            mensaje += `💰 Recompensa: ${exp.recompensa.monedas.toLocaleString()} 🐼\n\n`;
        }
    });

    const expedicionesListas = expedicionesActivas.filter(exp => exp.fin <= ahora).length;
    
    if (expedicionesListas > 0) {
        mensaje += `🎉 *${expedicionesListas} expedición(es) lista(s) para reclamar!*\n`;
        mensaje += `💡 Usa: .expedicion reclamar`;
    }

    await sock.sendMessage(from, { text: mensaje });
}

async function reclamarExpedicion(sock, from, user, db) {
    const ahora = Date.now();
    const expedicionesCompletadas = user.expediciones.activas.filter(exp => exp.fin <= ahora);

    if (expedicionesCompletadas.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ No hay expediciones listas para reclamar.\n\n💡 Usa .expedicion estado para ver el progreso.`
        });
        return;
    }

    let totalMonedas = 0;
    let efectosObtenidos = [];
    let itemsObtenidos = [];
    let personajesReclamados = [];

    for (const expedicion of expedicionesCompletadas) {
        // Recompensa base
        totalMonedas += expedicion.recompensa.monedas;
        personajesReclamados.push(expedicion.personaje);

        // Posible efecto adicional
        if (Math.random() < expedicion.recompensa.probabilidadEfecto) {
            const efectos = ['🌟', '⚡', '🔥', '💎', '🎯', '🌈', '🚀', '💫'];
            const efecto = efectos[Math.floor(Math.random() * efectos.length)];
            efectosObtenidos.push(efecto);
        }

        // Posible item especial
        if (Math.random() < expedicion.recompensa.probabilidadItem) {
            const itemsDisponibles = CONFIG_EXPEDICION.itemsEspeciales[expedicion.calidad];
            if (itemsDisponibles && itemsDisponibles.length > 0) {
                const item = itemsDisponibles[Math.floor(Math.random() * itemsDisponibles.length)];
                itemsObtenidos.push(item);
                
                // Registrar en inventario de items
                user.expediciones.itemsObtenidos = user.expediciones.itemsObtenidos || {};
                user.expediciones.itemsObtenidos[item] = (user.expediciones.itemsObtenidos[item] || 0) + 1;
            }
        }

        // Remover de expediciones activas
        user.expediciones.activas = user.expediciones.activas.filter(exp => exp.id !== expedicion.id);
    }

    // Actualizar estadísticas
    user.expediciones.completadas = (user.expediciones.completadas || 0) + expedicionesCompletadas.length;
    user.expediciones.tiempoTotal = (user.expediciones.tiempoTotal || 0) + expedicionesCompletadas.reduce((sum, exp) => sum + exp.duracion, 0);
    
    // Dar recompensas
    user.pandacoins = (user.pandacoins || 0) + totalMonedas;

    guardarDatabase(db);

    let mensaje = `🎉 *¡EXPEDICIONES RECLAMADAS!* 🎉\n\n`;
    mensaje += `👥 *Personajes que regresaron:*\n`;
    mensaje += `${personajesReclamados.map(p => `• ${p}`).join('\n')}\n\n`;
    mensaje += `💰 *Recompensa total:* ${totalMonedas.toLocaleString()} 🐼\n`;
    
    if (efectosObtenidos.length > 0) {
        mensaje += `✨ *Efectos obtenidos:* ${efectosObtenidos.join(' ')}\n`;
    }
    
    if (itemsObtenidos.length > 0) {
        mensaje += `🎁 *Items especiales:* ${itemsObtenidos.join(', ')}\n`;
    }
    
    mensaje += `\n📊 *Expediciones completadas:* ${user.expediciones.completadas}\n`;
    mensaje += `💼 *Saldo actual:* ${user.pandacoins.toLocaleString()} 🐼\n\n`;
    mensaje += `💡 Usa .expedicion items para ver todos tus items obtenidos.`;

    await sock.sendMessage(from, { text: mensaje });
}

async function mostrarItems(sock, from, user) {
    const itemsObtenidos = user.expediciones.itemsObtenidos || {};

    if (Object.keys(itemsObtenidos).length === 0) {
        await sock.sendMessage(from, {
            text: `📭 No has obtenido items especiales aún.\n\n💡 Envía personajes más raros en expediciones para aumentar tus posibilidades.`
        });
        return;
    }

    let mensaje = `🎁 *TUS ITEMS ESPECIALES* 🎁\n\n`;
    
    Object.entries(itemsObtenidos).forEach(([item, cantidad]) => {
        mensaje += `• ${item}: ${cantidad}\n`;
    });

    mensaje += `\n📊 *Total de items:* ${Object.values(itemsObtenidos).reduce((a, b) => a + b, 0)}\n\n`;
    mensaje += `💡 Estos items pueden usarse en futuras actualizaciones del bot.`;

    await sock.sendMessage(from, { text: mensaje });
}

async function cancelarExpedicion(sock, from, user, db) {
    if (user.expediciones.activas.length === 0) {
        await sock.sendMessage(from, {
            text: `❌ No tienes expediciones activas para cancelar.`
        });
        return;
    }

    // Cancelar la expedición más reciente
    const expedicionCancelada = user.expediciones.activas.pop();
    
    guardarDatabase(db);

    await sock.sendMessage(from, {
        text: `❌ *EXPEDICIÓN CANCELADA*\n\n👤 *Personaje:* ${expedicionCancelada.personaje}\n⚠️ *No se obtuvieron recompensas*\n\n🌌 *Expediciones activas:* ${user.expediciones.activas.length}/3`
    });
}
