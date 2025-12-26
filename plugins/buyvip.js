import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { isVip } from '../utils/vip.js';

export const command = 'buyvip';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const nombre = msg.pushName || 'Usuario';
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] || { pandacoins: 0 };
  
  const ticketCost = 50000000;
  const subCommand = args[0]?.toLowerCase();

  if (subCommand === 'ticket') {
    if (user.pandacoins < ticketCost) {
      await sock.sendMessage(from, { text: `❌ No tienes suficientes pandacoins para comprar un ticket VIP. Cuesta *${ticketCost}* pandacoins.` });
      return;
    }
    
    user.pandacoins -= ticketCost;
    user.vip = true;
    user.vipExpiration = Date.now() + 72 * 60 * 60 * 1000;
    guardarDatabase(db);
    
    await sock.sendMessage(from, { text: `✅ ¡Felicidades!, ${nombre}. Has comprado un ticket VIP por 72 horas. Disfruta de los beneficios.` });
    return;
  }

  const creatorContact = '+56 9 5350 8566';
  const message = `
👑 *COMPRAR MEMBRESÍA VIP* 👑

Para adquirir el estatus VIP, contacta al creador de PandaBot:
📞 *Contacto:* ${creatorContact}

*Precios:*
- 💰 *1 Semana:* $1 USD | 1000$ CLP
- 💰 *1 Mes:* $2 USD | 2000$ CLP
- 💰 *De por vida:* $3 USD | 3000$ CLP

*Métodos de pago:*

- PayPal
- Transferencia bancaria (Chile)

---------------------------
🎟️ *TICKET VIP (72 horas)*
Si no puedes pagar, puedes comprar un ticket VIP por 72 horas con Pandacoins.
Costo: *${ticketCost}* Pandacoins
Tu saldo: *${user.pandacoins || 0}* Pandacoins

Para comprar:
*.buyvip ticket*

---------------------------`;

  await sock.sendMessage(from, { text: message });
}
