import fs from 'fs';
import { ownerNumber } from '../config.js';

export const command = 'delcode';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
    
    if (!ownerNumber.includes(`+${sender}`)) {
        await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
        return;
    }

    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: '❌ Uso: .deletecode <código>'
        });
        return;
    }

    const codigo = args[0].toUpperCase();

    try {
        const codesData = JSON.parse(fs.readFileSync('./data/codes.json', 'utf8'));

        if (!codesData.codes[codigo]) {
            await sock.sendMessage(from, {
                text: `❌ El código *${codigo}* no existe.`
            });
            return;
        }


        delete codesData.codes[codigo];


        fs.writeFileSync('./data/codes.json', JSON.stringify(codesData, null, 2));

        await sock.sendMessage(from, {
            text: `*✅ Código *${codigo}* eliminado exitosamente.*`
        });

    } catch (error) {
        console.error('Error en deletecode:', error);
        await sock.sendMessage(from, {
            text: '❌ Error al eliminar el código.'
        });
    }
}
