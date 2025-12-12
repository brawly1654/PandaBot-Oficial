import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

async function test() {
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: {
      creds: {},
      keys: {}
    }
  });
  
  sock.ev.on('messages.upsert', ({ messages }) => {
    console.log('📥 MENSAJE RECIBIDO:');
    messages.forEach(msg => {
      console.log('De:', msg.key.remoteJid);
      console.log('Texto:', msg.message?.conversation || '[media]');
    });
  });
}

test();
