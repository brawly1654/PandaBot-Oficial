export const command = 'admins';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {
    const metadata = await sock.groupMetadata(from);


    const admins = metadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

    if (admins.length === 0) {
      return await sock.sendMessage(from, { text: '❌ Este grupo no tiene administradores visibles.' });
    }


    const lista = admins
      .map((a, i) => `${i + 1}. @${a.id.split('@')[0]} (${a.admin})`)
      .join('\n');

    await sock.sendMessage(from, { 
      text: `🛡️ *Lista de administradores*\n\n${lista}`,
      mentions: admins.map(a => a.id)
    });

  } catch (e) {
    console.error('❌ Error en admins:', e);
    await sock.sendMessage(from, { text: '❌ Error al obtener los administradores del grupo.' });
  }
}