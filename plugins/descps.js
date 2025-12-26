import fs from 'fs';

const filePath = './data/personajes.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const personajes = data.characters;


const owners = ['166164298780822@lid'];

export const command = 'descps';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;


  if (!owners.includes(sender)) {
    await sock.sendMessage(from, { text: '❌ Este comando es solo para el creador del bot.' });
    return;
  }

  const texto = args.join(' ');
  if (!texto.includes('|')) {
    await sock.sendMessage(from, {
      text: '❌ Uso incorrecto.\nFormato correcto:\n.descpersonaje <nombre> | <nueva descripción>\n\nEjemplo:\n.descpersonaje Chotavio | Nueva descripción del personaje'
    });
    return;
  }

  const [nombreInput, nuevaDescripcion] = texto.split('|').map(e => e.trim());
  const nombreBuscado = nombreInput.replace(/ /g, ' ');

  const personaje = personajes.find(p => p.nombre.toLowerCase() === nombreBuscado.toLowerCase());

  if (!personaje) {
    await sock.sendMessage(from, { text: `❌ No se encontró ningún personaje llamado "${nombreInput}".` });
    return;
  }

  personaje.descripcion = nuevaDescripcion;


  fs.writeFileSync(filePath, JSON.stringify({ characters: personajes }, null, 2));

  await sock.sendMessage(from, {
    text: `✅ La descripción del personaje *${personaje.nombre.replace(/_/g, ' ')}* ha sido actualizada.`
  });
}
