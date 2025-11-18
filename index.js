import { reiniciarStock } from './plugins/addstock.js';
import { migrarStockPlano } from './plugins/addstock.js';
migrarStockPlano();

global.psSpawn = {
  activo: false,
  personaje: null,
  grupo: '120363402403091432@g.us',
  reclamadoPor: null
};

import { limpiarPersonajes } from "./limpiarPersonajes.js";
import baileys from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { handleMessage } from './handler.js';
import readline from 'readline';
import chalk from 'chalk';
import NodeCache from 'node-cache';
import pino from 'pino';
import { cargarDatabase, guardarDatabase } from './data/database.js';
import { createDatabaseBackup } from './tools/createBackup.js';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser,
  makeCacheableSignalKeyStore
} from "@whiskeysockets/baileys";

global.cmDB = JSON.parse(fs.readFileSync('./coinmaster.json'));
global.guardarCM = () => fs.writeFileSync('./coinmaster.json', JSON.stringify(global.cmDB, null, 2));
global.recolectarCooldown = {};

// Logs pandabot
global.terminalLogs = [];
const logLimit = 20;
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  originalConsoleLog.apply(console, args);
  if (message.includes('.buy')) {
    global.terminalLogs.push(message);
    if (global.terminalLogs.length > logLimit) {
      global.terminalLogs.shift();
    }
  }
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

// Limpieza
import fs from 'fs';
const resultado = limpiarPersonajes("./data/personajes.json");
console.log("Personajes únicos:", resultado.length);

// Configuración
const msgRetryCounterCache = new NodeCache();
const sessions = 'auth_info';
const nameqr = 'PandaBot';
const methodCodeQR = process.argv.includes("qr");
const methodCode = process.argv.includes("code");
let startupBackupCreated = false;

function ensureStartupBackup() {
  if (startupBackupCreated) return;
  try {
    const { backupPath } = createDatabaseBackup({
      filenameFormatter: (timestamp) => `backup_startup(${timestamp}).json`,
      filenamePrefix: 'backup',
      maxBackups: 10
    });
    console.log(`📦 Backup inicial creado: ${backupPath}`);
  } catch (error) {
    console.error('❌ No se pudo crear el backup inicial:', error.message);
  } finally {
    startupBackupCreated = true;
  }
}

async function startBot() {
  ensureStartupBackup();
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(sessions);

  const auth = {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
  };

  // ============================================
  // DETERMINAR MÉTODO DE CONEXIÓN
  // ============================================
  let connectionMethod = 'qr';
  
  if (methodCode) {
    connectionMethod = 'code';
  } else if (!fs.existsSync(`./${sessions}/creds.json`)) {
    console.log(chalk.bold.magentaBright(`\n⌨ Selecciona una opción:`));
    console.log(chalk.bold.greenBright(`1. Con código QR`));
    console.log(chalk.bold.cyanBright(`2. Con código de texto de 8 dígitos`));
    const choice = await question(chalk.bold.yellowBright(`--> `));
    connectionMethod = choice === '2' ? 'code' : 'qr';
  }

  // ============================================
  // CREAR SOCKET
  // ============================================
  const sock = makeWASocket({
    version,
    auth,
    printQRInTerminal: connectionMethod === 'qr',
    browser: connectionMethod === 'qr' 
      ? [nameqr, 'Chrome', '20.0.04'] 
      : ['Ubuntu', 'Edge', '110.0.1587.56'],
    msgRetryCounterCache,
    getMessage: async (clave) => {
      let jid = jidNormalizedUser(clave.remoteJid);
      let msg = await store.loadMessage(jid, clave.id);
      return msg?.message || "";
    },
  });

  sock.ev.on('creds.update', saveCreds);

  // ============================================
  // EVENTOS DE GRUPO
  // ============================================
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    let texto = '';

    if (action === 'add') {
      texto = `
👋 Bienvenido @${participants[0].split('@')[0]} al grupo!

Recuerda leer la descripción del grupo, si quieres usar al bot envía *.menu* o *.help* para ver los comandos totales.
`;
    } else if (action === 'remove') {
      texto = `@${participants[0].split('@')[0]} Salió del grupo.👎`;
    } else if (action === 'promote') {
      texto = `🎉 @${participants[0].split('@')[0]} ahora es admin del grupo.`;
    } else if (action === 'demote') {
      texto = `⚠️ @${participants[0].split('@')[0]} ha sido removido como admin.`;
    }

    if (texto) {
      await sock.sendMessage(id, { text: texto, mentions: participants });
    }
  });

  // ============================================
  // MANEJO DE MENSAJES
  // ============================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      try {
        await handleMessage(sock, msg);
      } catch (e) {
        console.error('❌ Error en handleMessage:', e);
      }
    }
  });

  // ============================================
  // CONEXIÓN - AQUÍ ESTÁ EL FIX 🔥
  // ============================================
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ✅ Mostrar QR si es necesario
    if (qr && connectionMethod === 'qr') {
      console.log(chalk.bold.yellowBright('\n📱 Escanea este QR para vincular el bot:\n'));
      qrcode.generate(qr, { small: true });
    }

    // ✅ PEDIR PAIRING CODE AQUÍ (antes de conectarse completamente)
    if (connection === 'connecting' && connectionMethod === 'code') {
      // Esperar un momento para que el socket esté listo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!sock.authState.creds.registered) {
        console.log(chalk.bold.cyanBright('\n🔐 Modo de emparejamiento con código'));
        const phoneNumber = await question(chalk.bold.magentaBright(`\n📱 Ingresa tu número (ej: 56912345678)\n--> `));
        
        if (phoneNumber && phoneNumber.replace(/\D/g, '').length >= 10) {
          try {
            const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
            console.log(chalk.bold.white(chalk.bgMagenta(`\n✞ CÓDIGO DE VINCULACIÓN ✞ `)), chalk.bold.white(code));
            console.log(chalk.bold.yellowBright(`\n📲 Ingresa este código en WhatsApp -> Dispositivos vinculados -> Vincular dispositivo`));
          } catch (error) {
            console.log(chalk.bold.redBright(`❌ Error al solicitar código: ${error.message}`));
          }
        } else {
          console.log(chalk.bold.redBright(`❌ Número de teléfono inválido.`));
          rl.close();
        }
      }
    }

    // ✅ Conexión establecida
    if (connection === 'open') {
      console.log(chalk.bold.greenBright('\n✅ Bot conectado correctamente!'));
      console.log(chalk.bold.cyanBright(`📱 Dispositivo: ${sock.user.id}`));
      console.log(chalk.bold.yellowBright(`🤖 Bot listo para recibir comandos\n`));

      // 🌀 Spawneo automático de PS secreto cada 10 minutos con 5% de probabilidad
      setInterval(() => {
        const prob = Math.random();
        if (prob < 0.05 && !global.psSpawn?.activo) {
          const data = JSON.parse(fs.readFileSync('./data/personajes.json', 'utf8'));
          const secretos = data.characters.filter(p => p.calidad === 'Secret');
          
          if (secretos.length === 0) return;
          
          const personaje = secretos[Math.floor(Math.random() * secretos.length)];
          global.psSpawn = {
            activo: true,
            personaje,
            grupo: '120363402403091432@g.us',
            reclamadoPor: null
          };

          sock.sendMessage(global.psSpawn.grupo, {
            text: `🌀 A SECRET PS HAS SPAWNED IN THIS GROUP!\nUse *.claim* to get *${personaje.nombre}* before anyone else!`
          });
        }
      }, 10 * 60 * 1000);

      // 🔄 Reiniciar stock cada minuto
      setInterval(() => {
        reiniciarStock();
      }, 60 * 1000);
    }

    // ⚠️ Conexión cerrada
    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(chalk.bold.yellowBright('⚠️ Conexión cerrada'));
      console.log(chalk.bold.cyanBright(`Código: ${statusCode}`));
      console.log(chalk.bold.magentaBright(`Reconectar: ${shouldReconnect}`));

      if (shouldReconnect) {
        console.log(chalk.bold.greenBright('🔄 Reconectando en 5 segundos...'));
        setTimeout(() => startBot(), 5000);
      } else {
        console.log(chalk.bold.redBright('❌ Bot deslogueado. Borra la carpeta auth_info y vuelve a iniciar.'));
      }
    }
  });
}

// ============================================
// INICIAR BOT
// ============================================
console.log(chalk.bold.magentaBright(`
╔═══════════════════════════════════════╗
║                                       ║
║         🐼 PANDABOT INICIANDO 🐼      ║
║                                       ║
╚═══════════════════════════════════════╝
`));

startBot();
