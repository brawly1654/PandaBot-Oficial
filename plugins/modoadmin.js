import fs from 'fs';

export const command = 'modoadmin';
export const groupOnly = true;
export const adminOnly = true;

const FILE = './data/modoadmin.json';

function load() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (!args[0] || !['on', 'off'].includes(args[0])) {
    return sock.sendMessage(from, {
      text: '⚙️ Uso correcto:\n.modoadmin on\n.modoadmin off'
    });
  }

  const db = load();

  if (args[0] === 'on') {
    db[from] = true;
    save(db);
    return sock.sendMessage(from, { text: '🛡️ *Modo Admin ACTIVADO*\nSolo admins y owners pueden usar comandos.' });
  }

  if (args[0] === 'off') {
    delete db[from];
    save(db);
    return sock.sendMessage(from, { text: '✅ *Modo Admin DESACTIVADO*\nTodos pueden usar comandos.' });
  }
}
