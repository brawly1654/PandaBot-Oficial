import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import chalk from 'chalk';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import NodeCache from 'node-cache';
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers 
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { handleMessage } from './handler.js';
import { cargarDatabase, guardarDatabase } from './data/database.js';
import { createDatabaseBackup } from './tools/createBackup.js';
import { reiniciarStock } from './plugins/addstock.js';
import { limpiarPersonajes } from "./limpiarPersonajes.js";

// ======================
// VARIABLES GLOBALES
// ======================

global.psSpawn = {
  activo: false,
  personaje: null,
  grupo: '120363402403091432@g.us',
  reclamadoPor: null
};

// Sistema de rate limiting
global.rateLimit = new Map();
global.MAX_REQUESTS_PER_MINUTE = 30;
global.MAX_MESSAGES_PER_SECOND = 15;
global.MAX_CONCURRENT_REQUESTS = 3;

global.requestStats = {
  total: 0,
  success: 0,
  errors: 0,
  rateLimited: 0
};

// Cargar base de datos coinmaster
try {
  global.cmDB = JSON.parse(fs.readFileSync('./coinmaster.json', 'utf-8'));
} catch (error) {
  global.cmDB = {};
  console.log(chalk.yellow('📁 Creando nueva base de datos coinmaster...'));
  fs.writeFileSync('./coinmaster.json', JSON.stringify({}, null, 2));
}

global.guardarCM = () => {
  try {
    fs.writeFileSync('./coinmaster.json', JSON.stringify(global.cmDB, null, 2));
  } catch (error) {
    console.error(chalk.red('❌ Error guardando coinmaster:'), error.message);
  }
};

// Cooldown para recolección
global.recolectarCooldown = {};

// Logs de terminal
global.terminalLogs = [];

// Configuración de limpieza de personajes
try {
  const resultado = limpiarPersonajes("./data/personajes.json");
  console.log(chalk.green(`✅ Personajes limpiados: ${resultado.length}`));
} catch (error) {
  console.error(chalk.red('❌ Error en limpiarPersonajes:'), error.message);
}

// ======================
// CONFIGURACIÓN INICIAL
// ======================

const sessionsDir = 'auth_info';
const methodCodeQR = process.argv.includes("qr");
const methodCode = process.argv.includes("code");
let startupBackupCreated = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const msgRetryCounterCache = new NodeCache();

// Backup inicial
function ensureStartupBackup() {
  if (startupBackupCreated) return;
  try {
    const { backupPath } = createDatabaseBackup({
      filenameFormatter: (timestamp) => `backup_startup_${timestamp}.json`,
      filenamePrefix: 'backup',
      maxBackups: 5
    });
    console.log(chalk.cyan(`📦 Backup inicial creado: ${backupPath}`));
    startupBackupCreated = true;
  } catch (error) {
    console.error(chalk.red('❌ Error en backup:'), error.message);
  }
}

// ======================
// SISTEMA DE RATE LIMIT
// ======================

let globalRequestCount = 0;
let lastResetTime = Date.now();

// Resetear contadores cada minuto
setInterval(() => {
  globalRequestCount = 0;
  lastResetTime = Date.now();
  global.rateLimit.clear();
  console.log(chalk.gray('🔄 Rate limit reseteado'));
}, 60000);

function checkRateLimit(userId) {
  const now = Date.now();
  
  // Rate limit global por minuto
  if (globalRequestCount >= global.MAX_MESSAGES_PER_SECOND * 60) {
    global.requestStats.rateLimited++;
    return false;
  }
  
  // Rate limit por usuario
  const userKey = `user_${userId}`;
  const userData = global.rateLimit.get(userKey) || { count: 0, lastReset: now };
  
  if (now - userData.lastReset > 60000) {
    userData.count = 0;
    userData.lastReset = now;
  }
  
  if (userData.count >= global.MAX_REQUESTS_PER_MINUTE) {
    global.requestStats.rateLimited++;
    return false;
  }
  
  userData.count++;
  global.rateLimit.set(userKey, userData);
  globalRequestCount++;
  global.requestStats.total++;
  
  return true;
}

// ======================
// FUNCIONES DE LOGGING
// ======================

/**
 * Extrae el texto de un mensaje
 */
function extractMessageText(msg) {
  if (!msg.message) return '';
  
  // Mensaje de texto simple
  if (msg.message.conversation) {
    return msg.message.conversation;
  }
  
  // Mensaje extendido (reply, etc.)
  if (msg.message.extendedTextMessage?.text) {
    return msg.message.extendedTextMessage.text;
  }
  
  // Imagen con caption
  if (msg.message.imageMessage?.caption) {
    return msg.message.imageMessage.caption;
  }
  
  // Video con caption
  if (msg.message.videoMessage?.caption) {
    return msg.message.videoMessage.caption;
  }
  
  // Documento con caption
  if (msg.message.documentMessage?.caption) {
    return msg.message.documentMessage.caption;
  }
  
  return '';
}

/**
 * Formatea el remitente para mostrar
 */
function formatSender(msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = sender.endsWith('@g.us');
  
  // Extraer número
  let number = sender.split('@')[0];
  if (number.includes(':')) {
    number = number.split(':')[0];
  }
  
  // Obtener nombre de usuario si está disponible
  const pushName = msg.pushName || 'Sin nombre';
  
  if (isGroup) {
    const groupId = msg.key.remoteJid;
    return {
      display: `${pushName} (${number})`,
      number: number,
      name: pushName,
      group: groupId,
      isGroup: true
    };
  } else {
    return {
      display: `${pushName} (${number})`,
      number: number,
      name: pushName,
      isGroup: false
    };
  }
}

/**
 * Muestra el mensaje en consola
 */
function logIncomingMessage(msg) {
  try {
    const text = extractMessageText(msg);
    if (!text) return; // No mostrar mensajes sin texto
    
    const senderInfo = formatSender(msg);
    const isCommand = text.startsWith('.');
    
    // Formatear para consola
    const timestamp = new Date().toLocaleTimeString();
    const location = senderInfo.isGroup ? 'GRUPO' : 'PRIVADO';
    
    if (isCommand) {
      // Mostrar comandos en color amarillo
      console.log(
        chalk.gray(`[${timestamp}]`),
        chalk.cyan(location),
        chalk.magenta('⚡'),
        chalk.yellow(senderInfo.display),
        chalk.white('->'),
        chalk.green(text)
      );
    } else {
      // Mostrar mensajes normales en color gris
      console.log(
        chalk.gray(`[${timestamp}]`),
        chalk.cyan(location),
        chalk.blue('✉️'),
        chalk.yellow(senderInfo.display),
        chalk.white(':'),
        chalk.gray(text.length > 50 ? text.substring(0, 50) + '...' : text)
      );
    }
  } catch (error) {
    console.error(chalk.red('❌ Error en logging:'), error.message);
  }
}

function showStats() {
  const stats = global.requestStats;
  const now = new Date().toLocaleTimeString();
  
  console.log(chalk.cyan(`
╔══════════════════════════════════╗
║     📊 ESTADÍSTICAS [${now}]     ║
╠══════════════════════════════════╣
║ Total de peticiones: ${String(stats.total).padEnd(8)} ║
║ Exitosas: ${String(stats.success).padEnd(11)} ✅ ║
║ Errores: ${String(stats.errors).padEnd(12)} ❌ ║
║ Rate limited: ${String(stats.rateLimited).padEnd(5)} ⏰ ║
╚══════════════════════════════════╝
  `));
}

// Mostrar estadísticas cada 10 minutos
setInterval(showStats, 10 * 60 * 1000);

async function delayedReconnect(attempt) {
  const delay = Math.min(1000 * Math.pow(2, attempt), 20000);
  console.log(chalk.yellow(`\n🔄 Reconectando en ${delay/1000} segundos... (Intento ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`));
  
  await new Promise(resolve => setTimeout(resolve, delay));
  await startBot();
}

// ======================
// FUNCIÓN PRINCIPAL
// ======================

async function startBot() {
  try {
    // Crear backup inicial
    ensureStartupBackup();
    
    // Obtener última versión de Baileys
    const { version } = await fetchLatestBaileysVersion();
    
    // Estado de autenticación
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    
    // Configuración del socket
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      printQRInTerminal: methodCodeQR || !methodCode,
      browser: Browsers.macOS('Desktop'),
      msgRetryCounterCache,
      logger: pino({ 
        level: 'error', // Solo errores de Baileys
        transport: {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      }),
      markOnlineOnConnect: true,
      syncFullHistory: false,
      getMessage: async () => ({
        conversation: "Mensaje no disponible"
      })
    });
    
    // Guardar socket globalmente
    global.sock = sock;
    
    // Actualizar credenciales
    sock.ev.on('creds.update', saveCreds);
    
    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async (data) => {
      if (data.type !== 'notify') return;
      
      for (const msg of data.messages) {
        // Ignorar mensajes propios
        if (msg.key.fromMe) continue;
        
        // Verificar que tenga contenido
        if (!msg.message) continue;
        
        // Loggear mensaje en consola
        logIncomingMessage(msg);
        
        // Verificar rate limit
        const userId = msg.key.participant || msg.key.remoteJid;
        if (!checkRateLimit(userId)) {
          console.log(chalk.yellow(`⏰ Rate limit excedido para: ${userId}`));
          continue;
        }
        
        // Procesar mensaje
        try {
          await handleMessage(sock, msg);
          global.requestStats.success++;
        } catch (error) {
          console.error(chalk.red(`❌ Error procesando mensaje: ${error.message}`));
          global.requestStats.errors++;
        }
      }
    });
    
    // Loggear otros eventos
    sock.ev.on('messages.update', (updates) => {
      // Aquí puedes agregar logging para actualizaciones de mensajes si lo necesitas
    });
    
    sock.ev.on('message-receipt.update', (updates) => {
      // Loggear recibidos y leídos si quieres
    });
    
    // Manejar actualizaciones de conexión
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(chalk.yellow('\n📱 ESCANEA EL CÓDIGO QR CON WHATSAPP:\n'));
        qrcode.generate(qr, { small: true });
      }
      
      if (connection === 'connecting') {
        console.log(chalk.blue('🔄 Conectando...'));
        
        // Modo código de emparejamiento
        if (methodCode && !sock.authState.creds.registered) {
          console.log(chalk.cyan('\n🔐 MODO CÓDIGO DE EMPAREJAMIENTO'));
          
          try {
            const code = await sock.requestPairingCode('56912345678'.replace(/\D/g, ''));
            console.log(chalk.white(`🔢 Tu código es: ${code}`));
          } catch (error) {
            console.log(chalk.red(`❌ Error generando código: ${error.message}`));
          }
        }
      }
      
      if (connection === 'open') {
        console.log(chalk.green('\n✅ BOT CONECTADO EXITOSAMENTE!'));
        console.log(chalk.cyan(`👤 Usuario: ${sock.user?.id || 'Desconocido'}`));
        console.log(chalk.cyan(`📱 Número: ${sock.user?.id?.split(':')[0]?.split('@')[0] || 'N/A'}`));
        
        reconnectAttempts = 0;
        
        // Iniciar sistema de stock
        try {
          setInterval(() => {
            try {
              reiniciarStock();
              console.log(chalk.gray('[SISTEMA] Stock reiniciado automáticamente'));
            } catch (error) {
              console.error(chalk.red('❌ Error en sistema de stock:'), error.message);
            }
          }, 60 * 1000); // Cada minuto
          
          console.log(chalk.green('✅ Sistema de stock iniciado (cada 60s)'));
        } catch (error) {
          console.error(chalk.red('❌ Error iniciando sistemas:'), error);
        }
        
        // Mostrar mensaje de estado
        console.log(chalk.green('\n🚀 Bot listo para recibir mensajes...\n'));
      }
      
      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(chalk.yellow(`\n⚠️  CONEXIÓN CERRADA (Código: ${statusCode})`));
        
        if (shouldReconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          await delayedReconnect(reconnectAttempts - 1);
        } else {
          console.log(chalk.red('\n❌ DESCONECTADO PERMANENTEMENTE'));
          console.log(chalk.yellow('🗑️  Elimina la carpeta "auth_info" para reiniciar sesión'));
          process.exit(1);
        }
      }
    });
    
    // Mostrar banner de inicio
    console.log(chalk.magenta(`
╔══════════════════════════════════════════════╗
║             🐼 PANDA BOT 🐼                  ║
║           ⚡ VERSIÓN OPTIMIZADA ⚡            ║
║                                              ║
║  Conectando con WhatsApp Web...              ║
║  [Logs de mensajes activados]                ║
╚══════════════════════════════════════════════╝
    `));
    
    // Iniciar también el sistema de limpieza de cooldowns
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of Object.entries(global.recolectarCooldown)) {
        if (now - timestamp > 3600000) { // 1 hora
          delete global.recolectarCooldown[key];
        }
      }
    }, 60000); // Cada minuto
    
  } catch (error) {
    console.error(chalk.red('\n❌ ERROR CRÍTICO EN STARTBOT:'), error);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      await delayedReconnect(reconnectAttempts - 1);
    } else {
      console.log(chalk.red('❌ MÁXIMO DE INTENTOS DE RECONEXIÓN ALCANZADO'));
      process.exit(1);
    }
  }
}

// ======================
// MANEJO DE EXCEPCIONES
// ======================

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n⚠️  EXCEPCIÓN NO CAPTURADA:'), error.message);
  console.error(chalk.gray('Stack trace:'), error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n⚠️  PROMESA RECHAZADA NO MANEJADA:'), reason);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Recibida señal de interrupción (Ctrl+C)'));
  
  // Guardar base de datos antes de salir
  try {
    guardarDatabase();
    global.guardarCM();
    console.log(chalk.green('✅ Bases de datos guardadas'));
  } catch (error) {
    console.error(chalk.red('❌ Error guardando datos:'), error.message);
  }
  
  process.exit(0);
});

// ======================
// INICIAR EL BOT
// ======================

startBot();
