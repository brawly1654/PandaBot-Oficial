import fs from 'fs';

const FILE = './data/antilink.json';

function load() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export const command = 'antilink';
export const groupOnly = true;
export const adminOnly = true;

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  if (!args[0] || !['on', 'off'].includes(args[0])) {
    return sock.sendMessage(from, {
      text: 'Uso correcto:\n.antilink on\n.antilink off'
    });
  }

  const data = load();
  data[from] = args[0] === 'on';
  save(data);

  await sock.sendMessage(from, {
    text: `🔗 Antilink ${args[0] === 'on' ? 'ACTIVADO' : 'DESACTIVADO'}`
  });
}
