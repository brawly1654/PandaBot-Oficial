import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testReceptor() {
  console.log('🚀 INICIANDO TEST RECEPTOR...\n');
  
  const sessionsDir = join(__dirname, 'auth_info_test');
  
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: state.keys,
      },
      printQRInTerminal: false,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // 1. ESCUCHAR MENSAJES - SIN FILTROS
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      console.log(`\n📥 📥 📥 MENSAJE RECIBIDO 📥 📥 📥`);
      console.log(`Tipo: ${type}`);
      console.log(`Cantidad: ${messages.length}`);
      
      messages.forEach((msg, i) => {
        console.log(`\n--- Mensaje ${i+1} ---`);
        console.log(`De: ${msg.key.remoteJid}`);
        console.log(`ID: ${msg.key.id}`);
        console.log(`FromMe: ${msg.key.fromMe}`);
        
        if (msg.message) {
          console.log(`Contenido:`);
          if (msg.message.conversation) {
            console.log(`  Texto: "${msg.message.conversation}"`);
          }
          if (msg.message.extendedTextMessage?.text) {
            console.log(`  Texto extendido: "${msg.message.extendedTextMessage.text}"`);
          }
          if (msg.message.imageMessage) {
            console.log(`  Imagen con caption: "${msg.message.imageMessage.caption || 'Sin caption'}"`);
          }
          console.log(`Mensaje completo keys:`, Object.keys(msg.message));
        } else {
          console.log(`  SIN MENSAJE en msg.message`);
        }
      });
    });
    
    // 2. ESCUCHAR CONEXIÓN
    sock.ev.on('connection.update', (update) => {
      console.log(`\n🔗 Estado conexión: ${update.connection}`);
      
      if (update.qr) {
        console.log('\n📱 QR GENERADO:');
        qrcode.generate(update.qr, { small: true });
      }
      
      if (update.connection === 'open') {
        console.log('\n✅ CONECTADO! Envía un mensaje al bot ahora...');
      }
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

testReceptor();
