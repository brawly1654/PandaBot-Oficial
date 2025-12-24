import { reiniciarStock, migrarStockPlano } from './plugins/addstock.js';
import { limpiarPersonajes } from "./limpiarPersonajes.js";
import { handleMessage } from './handler.js';

import chalk from 'chalk';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

// =================================
// CONFIG GLOBAL
// =================================

process.env.NODE_OPTIONS = '--max-old-space-size=512';

const logger = pino({ level: 'silent' });

global.sock = null;
global.cmDB = {};

// =================================
// COINMASTER
// =================================

const CM_PATH = './coinmaster.json';

if (fs.existsSync(CM_PATH)) {
  try {
    global.cmDB = JSON.parse(fs.readFileSync(CM_PATH, 'utf8'));
  } catch {
    global.cmDB = {};
  }
}

global.guardarCM = () => {
  fs.promises.writeFile(CM_PATH, JSON.stringify(global.cmDB, null, 2))
    .catch(() => {});
};

// =================================
// CONEXIÓN WHATSAPP
// =================================

async function connectWhatsApp() {
  console.log(chalk.cyan('🔄 Conectando a WhatsApp...'));

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers.macOS('Safari'),
    logger,

    // ⚡ LATENCIA
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    emitOwnEvents: false,
    generateHighQualityLinkPreview: false,
    keepAliveIntervalMs: 20000,
    defaultQueryTimeoutMs: 30000
  });

  global.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  // =============================
  // CONEXIÓN
  // =============================

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.clear();
      console.log(chalk.yellow('📱 ESCANEA EL QR'));
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.clear();
      console.log(chalk.green('✅ BOT CONECTADO'));
      console.log(chalk.gray(`👤 ${sock.user?.id}`));
      startBackgroundTasks();
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        console.log(chalk.red('❌ Sesión cerrada. Borra auth_info'));
        process.exit(1);
      }

      console.log(chalk.yellow('🔄 Reconectando en 5s...'));
      setTimeout(connectWhatsApp, 5000);
    }
  });

  // =============================
  // MENSAJES (SIN COLA 🔥)
  // =============================

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      handleMessage(sock, msg).catch(() => {});
    }
  });
}

// =================================
// TAREAS EN SEGUNDO PLANO
// =================================

function startBackgroundTasks() {
  setInterval(() => {
    try { reiniciarStock?.(); } catch {}
  }, 60_000);

  setInterval(() => {
    global.guardarCM();
  }, 120_000);

  setInterval(() => {
    console.log(chalk.gray(`🟢 Bot vivo | ${new Date().toLocaleTimeString()}`));
  }, 30 * 60_000);
}

// =================================
// INIT
// =================================

async function init() {
  console.clear();
  console.log(chalk.magenta(`
╔══════════════════════════╗
║       🐼 PANDABOT        ║
║    ⚡ ULTRA OPTIMIZADO   ║
╚══════════════════════════╝
`));

  if (!fs.existsSync('auth_info')) fs.mkdirSync('auth_info');

  try {
    if (fs.existsSync('./data/personajes.json')) {
      limpiarPersonajes('./data/personajes.json');
    }
    migrarStockPlano?.();
  } catch {}

  await connectWhatsApp();
}

// =================================
// SEGURIDAD
// =================================

process.on('SIGINT', () => {
  global.guardarCM();
  process.exit(0);
});

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

init();