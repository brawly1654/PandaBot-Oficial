import fs from 'fs';
import { ownerNumber } from '../config.js';

export const command = 'viewcodes';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
    
    if (!ownerNumber.includes(`+${sender}`)) {
        await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
        return;
    }

    try {
        const codesData = JSON.parse(fs.readFileSync('./data/codes.json', 'utf8'));
        const codes = codesData.codes;

        if (Object.keys(codes).length === 0) {
            await sock.sendMessage(from, {
                text: '📭 No hay códigos activos en este momento.'
            });
            return;
        }

        let mensaje = `🔐 *CÓDIGOS ACTIVOS* 🔐\n\n`;
        
        Object.entries(codes).forEach(([codigo, info]) => {
            const estado = info.activo ? '✅' : '❌';
            const tipo = info.recompensa >= 0 ? '🎁 Premio' : '💸 Multa';
            const recompensaText = info.recompensa >= 0 ? 
                `+${info.recompensa.toLocaleString()} 🐼` : 
                `${info.recompensa.toLocaleString()} 🐼`;
            
            mensaje += `${estado} *${codigo}*\n`;
            mensaje += `   ${tipo}: ${recompensaText}\n`;
            mensaje += `   Usos: ${info.usosActuales}/${info.usosMaximos}\n`;
            mensaje += `   Creado: ${new Date(info.fechaCreacion).toLocaleDateString()}\n`;
            mensaje += `   Por: ${info.creadoPor}\n\n`;
        });

        mensaje += `📊 *Total:* ${Object.keys(codes).length} códigos`;

        await sock.sendMessage(from, { text: mensaje });

    } catch (error) {
        console.error('Error en viewcodes:', error);
        await sock.sendMessage(from, {
            text: '❌ Error al cargar los códigos.'
        });
    }
}
