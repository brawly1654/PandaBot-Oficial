import { reiniciarStock } from './plugins/addstock.js';
import { migrarStockPlano } from './plugins/addstock.js';
import { limpiarPersonajes } from "./limpiarPersonajes.js";
import baileys from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { handleMessage } from './handler.js';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import pino from 'pino';
import { createDatabaseBackup } from './tools/createBackup.js';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";
import fs from 'fs';
import { petDB } from './data/petsystem.js';
// ============================================
// CONFIGURACIÓN DE LOGS - SILENCIAR BAILEYS
// ============================================

// Logger personalizado que filtra logs innecesarios
const filteredLogger = pino({
  level: 'error', // Solo mostrar errores
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      levelFirst: true,
      messageFormat: '{msg}'
    }
  }
});

// Sobrescribir console.log para filtrar logs de Baileys
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  
  // Filtrar logs internos de Baileys
  if (message.includes('Closing open session') ||
      message.includes('Closing session: SessionEntry') ||
      message.includes('_chains:') ||
      message.includes('registrationId:') ||
      message.includes('currentRatchet:') ||
      message.includes('indexInfo:') ||
      message.includes('baseKey:') ||
      message.includes('remoteIdentityKey:')) {
    return; // No mostrar estos logs
  }
  
  // Mostrar solo logs importantes
  if (message.includes('✅') || 
      message.includes('❌') || 
      message.includes('⚠️') || 
      message.includes('🔄') ||
      message.includes('📱') ||
      message.includes('📊') ||
      message.startsWith('╔') ||
      message.startsWith('║') ||
      message.startsWith('╚')) {
    originalConsoleLog.apply(console, args);
  }
};

console.error = (...args) => {
  const message = args.join(' ');
  
  // Filtrar errores no críticos de Baileys
  if (message.includes('SessionEntry') || 
      message.includes('prekey bundle') ||
      message.includes('_chains') ||
      message.includes('ratchet')) {
    return; // Silenciar estos errores
  }
  
  originalConsoleError.apply(console, args);
};

// ============================================
// VARIABLES GLOBALES OPTIMIZADAS
// ============================================

global.psSpawn = {
  activo: false,
  personaje: null,
  grupo: '120363402403091432@g.us',
  reclamadoPor: null
};

// Rate Limiter optimizado
class OptimizedRateLimiter {
  constructor() {
    this.userLimits = new Map();
    this.globalCount = 0;
    this.lastReset = Date.now();
    this.stats = { total: 0, success: 0, errors: 0, rateLimited: 0 };
    
    // Limpieza automática
    setInterval(() => this.cleanup(), 60000);
  }

  check(userId) {
    const now = Date.now();
    
    // Reset global cada minuto
    if (now - this.lastReset > 60000) {
      this.globalCount = 0;
      this.lastReset = now;
    }
    
    // Límite global (15/seg)
    if (this.globalCount >= 900) {
      this.stats.rateLimited++;
      return false;
    }
    
    // Límite por usuario
    const userKey = userId || 'unknown';
    let userData = this.userLimits.get(userKey);
    
    if (!userData || now - userData.lastReset > 60000) {
      userData = { count: 0, lastReset: now };
    }
    
    if (userData.count >= 30) {
      this.stats.rateLimited++;
      return false;
    }
    
    userData.count++;
    this.userLimits.set(userKey, userData);
    this.globalCount++;
    this.stats.total++;
    
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.userLimits.entries()) {
      if (now - data.lastReset > 120000) {
        this.userLimits.delete(key);
      }
    }
  }
}

global.rateLimiter = new OptimizedRateLimiter();

// Cola de mensajes optimizada (non-blocking)
class AsyncMessageQueue {
  constructor(maxConcurrent = 2) {
    this.queue = [];
    this.processing = false;
    this.activeCount = 0;
    this.maxConcurrent = maxConcurrent;
    this.stats = { processed: 0, dropped: 0 };
  }
  
  async add(message, type) {
    // Limitar tamaño de cola para no consumir mucha memoria
    if (this.queue.length > 50) {
      this.stats.dropped++;
      return;
    }
    
    this.queue.push({ message, type, timestamp: Date.now() });
    
    if (!this.processing) {
      this.processing = true;
      // Usar setImmediate para no bloquear el event loop
      setImmediate(() => this.process());
    }
  }
  
  async process() {
    if (this.queue.length === 0 || this.activeCount >= this.maxConcurrent) {
      this.processing = false;
      return;
    }
    
    this.activeCount++;
    const item = this.queue.shift();
    
    try {
      if (item.type === 'messages.upsert' && global.sock) {
        await this.handleMessage(item.message);
      }
      this.stats.processed++;
    } catch (error) {
      console.error('❌ Error en cola:', error.message);
    } finally {
      this.activeCount--;
      
      // Procesar siguiente con pequeño delay
      setTimeout(() => this.process(), 10);
    }
  }
  
  async handleMessage({ messages, type }) {
    if (type !== 'notify' || !messages) return;
    
    for (const msg of messages) {
      if (!msg.message || msg.key?.fromMe) continue;
      
      const userId = msg.key?.participant || msg.key?.remoteJid;
      if (!userId || !global.rateLimiter.check(userId)) continue;
      
      try {
        await handleMessage(global.sock, msg);
        global.rateLimiter.stats.success++;
      } catch (error) {
        console.error('❌ Error en handleMessage:', error.message);
        global.rateLimiter.stats.errors++;
      }
    }
  }
}

global.messageQueue = new AsyncMessageQueue();

// Cache optimizado
global.cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 120,
  maxKeys: 300,
  useClones: false // Mejor rendimiento
});

// Cargar coinmaster
try {
  if (fs.existsSync('./coinmaster.json')) {
    global.cmDB = JSON.parse(fs.readFileSync('./coinmaster.json', 'utf8'));
  } else {
    global.cmDB = {};
  }
} catch (error) {
  global.cmDB = {};
  console.error('❌ Error cargando coinmaster');
}

global.guardarCM = () => {
  try {
    fs.writeFileSync('./coinmaster.json', JSON.stringify(global.cmDB, null, 2));
  } catch (error) {
    console.error('❌ Error guardando coinmaster');
  }
};

global.recolectarCooldown = {};

// ============================================
// SISTEMA DE MONITOREO Y REINICIO
// ============================================

class BotMonitor {
  constructor() {
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.messageCount = 0;
    this.restartHours = 6; // Reiniciar cada 6 horas
    this.maxInactivity = 5; // Minutos de inactividad para reinicio
    
    console.log(chalk.blue(`🕐 Monitor activo - Reinicio cada ${this.restartHours}h`));
    
    // Health check cada 30 segundos
    setInterval(() => this.healthCheck(), 30000);
    
    // Reinicio programado
    setTimeout(() => {
      console.log(chalk.yellow('🔄 Reinicio programado iniciando...'));
      process.exit(0);
    }, this.restartHours * 60 * 60 * 1000);
  }
  
  recordActivity() {
    this.lastActivity = Date.now();
    this.messageCount++;
  }
  
  healthCheck() {
    const now = Date.now();
    const inactiveMinutes = (now - this.lastActivity) / 60000;
    
    if (inactiveMinutes > this.maxInactivity) {
      console.log(chalk.yellow(`⚠️ Inactivo por ${Math.round(inactiveMinutes)}m - Reiniciando...`));
      process.exit(1);
    }
    
    // Limpieza de memoria cada hora
    if (global.gc && now - this.startTime > 3600000) {
      global.gc();
    }
  }
  
  getStats() {
    const uptime = Date.now() - this.startTime;
    return {
      uptime: `${Math.floor(uptime / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m`,
      messages: this.messageCount,
      lastActivity: new Date(this.lastActivity).toLocaleTimeString()
    };
  }
}

global.monitor = new BotMonitor();

// ============================================
// CONEXIÓN OPTIMIZADA DE WHATSAPP
// ============================================

async function connectWhatsApp() {
  const sessions = 'auth_info';
  const methodCode = process.argv.includes("code");
  const methodQR = !methodCode && !fs.existsSync(`./${sessions}/creds.json`);
  
  try {
    // Configuración ultra optimizada de Baileys
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessions);
    
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, filteredLogger),
      },
      printQRInTerminal: methodQR,
      browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
      logger: filteredLogger, // Logger filtrado
      markOnlineOnConnect: false, // Más rápido
      syncFullHistory: false, // No cargar historial
      transactionOpts: {
        maxCommitRetries: 1,
        delayBetweenTries: 1000
      },
      retryRequestDelayMs: 1000,
      maxRetries: 2,
      connectTimeoutMs: 20000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: false,
      defaultQueryTimeoutMs: 10000,
      msgRetryCounterCache: new NodeCache(),
      getMessage: async () => ({})
    });
    
    global.sock = sock;
    
    // Eventos optimizados
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (data) => {
      global.monitor.recordActivity();
      await global.messageQueue.add(data, 'messages.upsert');
    });
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr && methodQR) {
        console.log(chalk.yellow('\n📱 Escanea este QR en WhatsApp:'));
        qrcode.generate(qr, { small: true });
      }
      
      if (connection === 'open') {
        console.log(chalk.green.bold('\n✅ CONECTADO - Bot listo!'));
        console.log(chalk.cyan(`👤 ${sock.user?.id?.split(':')[0] || 'Usuario'}`));
        
        // Iniciar tareas periódicas
        startBackgroundTasks();
        
        // Mostrar estadísticas periódicas
        setInterval(showStats, 300000);
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log(chalk.yellow('🔄 Reconectando en 5s...'));
          setTimeout(connectWhatsApp, 5000);
        } else {
          console.log(chalk.red('❌ Sesión expirada - Elimina auth_info/'));
          process.exit(1);
        }
      }
    });
    
    return sock;
    
  } catch (error) {
    console.error(chalk.red('❌ Error de conexión:'), error.message);
    
    // Reintentar en 10 segundos
    setTimeout(connectWhatsApp, 10000);
  }
}

// ============================================
// TAREAS EN SEGUNDO PLANO
// ============================================

function startBackgroundTasks() {
  // Stock cada minuto
  setInterval(() => {
    try {
      reiniciarStock();
    } catch (error) {
      console.error('❌ Error en stock');
    }
  }, 60000);
  
  // Guardar coinmaster cada 3 minutos
  setInterval(() => {
    try {
      global.guardarCM();
    } catch (error) {
      console.error('❌ Error guardando datos');
    }
  }, 180000);
  
  // Limpiar caché cada 15 minutos
  setInterval(() => {
    global.cache.flushAll();
  }, 900000);
  
  console.log(chalk.gray('🔧 Tareas programadas iniciadas'));
}

// ============================================
// ESTADÍSTICAS Y MONITOREO
// ============================================

function showStats() {
  const rateStats = global.rateLimiter.stats;
  const queueStats = global.messageQueue.stats;
  const monitorStats = global.monitor.getStats();
  
  console.log(chalk.magenta(`
┌─────────────────────────────┐
│ 📊 ESTADÍSTICAS DEL BOT     │
├─────────────────────────────┤
│ ⏱️  Uptime: ${monitorStats.uptime.padEnd(12)} │
│ 📨 Mensajes: ${monitorStats.messages.toString().padEnd(11)} │
│ ✅ Exitósas: ${rateStats.success.toString().padEnd(11)} │
│ ❌ Errores: ${rateStats.errors.toString().padEnd(12)} │
│ ⏰ Limitados: ${rateStats.rateLimited.toString().padEnd(10)} │
│ 📥 Procesados: ${queueStats.processed.toString().padEnd(9)} │
└─────────────────────────────┘
  `));
}

// ============================================
// INICIALIZACIÓN
// ============================================

async function initializeBot() {
  console.log(chalk.magenta(`
╔══════════════════════════╗
║     🐼 PANDABOT 🐼       ║
║   ⚡ ULTRA OPTIMIZADO    ║
║   🔇 LOGS SILENCIADOS   ║
╚══════════════════════════╝
  `));
  
  // Crear backup inicial
  try {
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }
    createDatabaseBackup();
    console.log(chalk.green('📦 Backup inicial creado'));
  } catch (error) {
    console.error('❌ Error en backup');
  }
  
  // Limpiar personajes
  try {
    const result = limpiarPersonajes("./data/personajes.json");
    console.log(chalk.green(`🧹 ${result?.length || 0} personajes limpiados`));
  } catch (error) {
    console.error('❌ Error limpiando personajes');
  }
  
  // Ejecutar migración
  try {
    migrarStockPlano();
  } catch (error) {
    console.error('❌ Error en migración');
  }
  
  // Conectar a WhatsApp
  await connectWhatsApp();
}

// ============================================
// MANEJO DE ERRORES GLOBALES
// ============================================

process.on('uncaughtException', (error) => {
  const message = error.message || String(error);
  
  // Ignorar errores internos de Baileys
  if (message.includes('SessionEntry') || 
      message.includes('prekey bundle') ||
      message.includes('ratchet') ||
      message.includes('_chains')) {
    return;
  }
  
  console.error(chalk.red('🔥 Error crítico:'), message.substring(0, 100));
  
  // No salir inmediatamente, intentar recuperar
  setTimeout(() => {
    if (global.sock) {
      console.log(chalk.yellow('🔄 Intentando recuperación...'));
    }
  }, 5000);
});

process.on('unhandledRejection', (reason) => {
  const message = reason?.message || String(reason);
  
  // Ignorar rechazos no críticos
  if (message.includes('session') || message.includes('timeout')) {
    return;
  }
  
  console.error(chalk.yellow('⚠️ Promesa rechazada:'), message.substring(0, 80));
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Apagando bot...'));
  console.log(chalk.green('✅ Sesión guardada correctamente'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⚡ Reinicio rápido...'));
  process.exit(0);
});

// ============================================
// INICIAR BOT
// ============================================

// Optimizar Node.js para mejor rendimiento
if (global.gc) {
  console.log(chalk.gray('🧠 GC manual habilitado'));
}

// Aumentar límites de memoria
process.setMaxListeners(20);

// Iniciar bot con retardo para estabilidad
setTimeout(() => {
  initializeBot().catch(error => {
    console.error(chalk.red('❌ Error fatal al iniciar:'), error.message);
    process.exit(1);
  });
}, 1000);
