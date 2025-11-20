import fs from 'fs';
import { ownerNumber } from '../config.js';

export const command = 'makecode';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
    
    if (!ownerNumber.includes(`+${sender}`)) {
        await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
        return;
    }

    if (args.length < 2) {
        await sock.sendMessage(from, {
            text: `❌ Uso: .makecode <código> <recompensa>\n\n📝 Ejemplos:\n• .makecode REGALO 10000\n• .makecode MULTA -5000\n• .makecode ESPECIAL 50000 10 (10 usos)\n\n💡 Usa números negativos para quitar pandacoins.`
        });
        return;
    }

    const codigo = args[0].toUpperCase();
    const recompensa = parseInt(args[1]);
    const usosMaximos = args[2] ? parseInt(args[2]) : 100;

    if (isNaN(recompensa)) {
        await sock.sendMessage(from, {
            text: '❌ La recompensa debe ser un número válido.'
        });
        return;
    }

    if (isNaN(usosMaximos) || usosMaximos <= 0) {
        await sock.sendMessage(from, {
            text: '❌ Los usos máximos deben ser un número mayor a 0.'
        });
        return;
    }

    try {
        const codesData = JSON.parse(fs.readFileSync('./data/codes.json', 'utf8'));

        // Verificar si el código ya existe
        if (codesData.codes[codigo]) {
            await sock.sendMessage(from, {
                text: `❌ El código *${codigo}* ya existe.`
            });
            return;
        }

        // Crear nuevo código
        codesData.codes[codigo] = {
            recompensa: recompensa,
            usosMaximos: usosMaximos,
            usosActuales: 0,
            creadoPor: `+${sender}`,
            fechaCreacion: new Date().toISOString(),
            activo: true
        };

        // Guardar cambios
        fs.writeFileSync('./data/codes.json', JSON.stringify(codesData, null, 2));

        const tipo = recompensa >= 0 ? '🎁 Código de premio' : '💸 Código de multa';
        
        await sock.sendMessage(from, {
            text: `✅ *¡Código Creado Exitosamente!*\n\n📛 *Código:* ${codigo}\n${tipo}: *${recompensa.toLocaleString()}* 🐼\n🎯 *Usos máximos:* ${usosMaximos}\n👑 *Creado por:* +${sender}\n\n💡 Los usuarios pueden canjearlo con: .code ${codigo}`
        });

    } catch (error) {
        console.error('Error en makecode:', error);
        await sock.sendMessage(from, {
            text: '❌ Error al crear el código.'
        });
    }
}
