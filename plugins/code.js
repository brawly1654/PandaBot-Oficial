import fs from 'fs';
import { cargarDatabase, guardarDatabase, addPandacoins } from '../data/database.js';
import { trackCodeClaim } from '../middleware/trackAchievements.js';

export const command = 'code';

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (args.length === 0) {
        await sock.sendMessage(from, {
            text: `🎁 *Sistema de Códigos Secretos*\n\n📝 Usa: .code <código>\n\n💡 Ejemplo: .code BIENVENIDA\n\n🎯 Canjea códigos para obtener recompensas especiales.`
        });
        return;
    }

    const codigo = args[0].toUpperCase();
    
    try {
        // Cargar base de datos de códigos
        const codesData = JSON.parse(fs.readFileSync('./data/codes.json', 'utf8'));
        const db = cargarDatabase();
        db.users = db.users || {};
        const user = db.users[sender] = db.users[sender] || {};
        user.pandacoins = user.pandacoins || 0;

        // Verificar si el código existe
        if (!codesData.codes[codigo]) {
            await sock.sendMessage(from, {
                text: `❌ El código *${codigo}* no existe o es inválido.`
            });
            return;
        }

        const codeInfo = codesData.codes[codigo];

        // Verificar si el código está activo
        if (!codeInfo.activo) {
            await sock.sendMessage(from, {
                text: `❌ El código *${codigo}* ya no está activo.`
            });
            return;
        }

        // Verificar si ya se usó el máximo de veces
        if (codeInfo.usosActuales >= codeInfo.usosMaximos) {
            await sock.sendMessage(from, {
                text: `❌ El código *${codigo}* ya ha sido canjeado todas las veces disponibles.`
            });
            return;
        }

        // Verificar si el usuario ya canjeó este código
        codesData.usuariosCanjeados = codesData.usuariosCanjeados || {};
        codesData.usuariosCanjeados[sender] = codesData.usuariosCanjeados[sender] || [];
        
        if (codesData.usuariosCanjeados[sender].includes(codigo)) {
            await sock.sendMessage(from, {
                text: `❌ Ya has canjeado el código *${codigo}* anteriormente.`
            });
            return;
        }

        // Aplicar recompensa
        const recompensa = codeInfo.recompensa;
        if (recompensa > 0) {
            addPandacoins(db, sender, recompensa, { sharePercent: 0.10 });
        } else {
            user.pandacoins = (user.pandacoins || 0) + recompensa;
        }

        // Actualizar estadísticas del código
        codeInfo.usosActuales += 1;
        codesData.usuariosCanjeados[sender].push(codigo);

        // Guardar cambios
        fs.writeFileSync('./data/codes.json', JSON.stringify(codesData, null, 2));
        guardarDatabase(db);
        try { trackCodeClaim(sender, sock, from); } catch (e) {}

        // Mensaje de éxito
        const tipoRecompensa = recompensa >= 0 ? "🎁 Ganaste" : "💸 Perdiste";
        const emoji = recompensa >= 0 ? "💰" : "😅";
        
        await sock.sendMessage(from, {
            text: `${emoji} *¡Código Canjeado Exitosamente!*\n\n📛 *Código:* ${codigo}\n${tipoRecompensa}: *${Math.abs(recompensa).toLocaleString()}* 🐼\n\n💰 *Saldo actual:* ${user.pandacoins.toLocaleString()} 🐼\n🎯 *Usos restantes:* ${codeInfo.usosMaximos - codeInfo.usosActuales}`
        });

    } catch (error) {
        console.error('Error en comando code:', error);
        await sock.sendMessage(from, {
            text: '❌ Ocurrió un error al procesar el código. Intenta nuevamente.'
        });
    }
}
