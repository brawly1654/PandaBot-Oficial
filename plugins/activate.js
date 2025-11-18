import { ownerNumber } from '../config.js';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import axios from 'axios';
import { efectosBoost, expiraciones, suerteTimeouts, getSuerteMultiplicador, getEfectosBoost as fetchBoosts } from '../lib/boostState.js';

const multiplicadores = {
    '🌈': 8,
    '🚽': 14,
    '👾': 5,
    '🇨🇱': 3,
    '☯️': 2.5,
    '🌭': 2,
    '🍬': 2,
    '🇧🇷': 2,
    '🇨🇴': 2,
    '🪳': 2,
    '💀': 1.5,
    '🌮': 1.5,
    '🫓': 1.5,
    '💧': 1.1,
    '💤': 0.5,
    '💩': 0.1,
    '🦆': 1.8
};

export const command = 'activate';

export const getEfectosBoost = fetchBoosts;

const pedoUrls = ['http://localhost:8000/upload/speedytiger_7_2025-11-12-17-27-56_1762979276351.mp4'];

async function enviarAudioPedo(sock, from, msg) {
    const randomUrl = pedoUrls[Math.floor(Math.random() * pedoUrls.length)];
    const loadingMsg = await sock.sendMessage(from, { text: '💀' });

    try {
        const videoRes = await axios.get(randomUrl, { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(videoRes.data);
        const inputPath = path.join(tmpdir(), `input-${Date.now()}.mp4`);
        const outputPath = path.join(tmpdir(), `audio-${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, videoBuffer);

        return new Promise((resolve, reject) => {
            exec(`ffmpeg -i "${inputPath}" -vn -acodec libmp3lame "${outputPath}"`, async (err) => {
                try { fs.unlinkSync(inputPath); } catch { }
                if (err) {
                    console.error(err);
                    await sock.sendMessage(from, { text: '❌ Error al extraer el audio del video.' }, { quoted: loadingMsg });
                    reject(err);
                    return;
                }
                try {
                    const audioBuffer = fs.readFileSync(outputPath);
                    await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mpeg' }, { quoted: msg });
                    resolve();
                } catch (readErr) {
                    console.error(readErr);
                    await sock.sendMessage(from, { text: '❌ No se pudo leer el audio procesado.' }, { quoted: loadingMsg });
                    reject(readErr);
                } finally {
                    try { fs.unlinkSync(outputPath); } catch { }
                }
            });
        });
    } catch (e) {
        console.error('❌ Error en el comando pedo (edit):', e);
        await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar the video.' }, { quoted: loadingMsg });
        throw e;
    }
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderId = sender.split('@')[0];

    if (!ownerNumber.includes(`+${senderId}`)) {
        await sock.sendMessage(from, { text: '❌ Este comando solo puede ser usado por los owners.' }, { quoted: msg });
        return;
    }

    const tipo = args[0]?.toLowerCase() || '';
    const subarg = args[1]?.toLowerCase() || '';

    if (tipo === 'viewboosts') {
        if (Object.keys(efectosBoost).length === 0) {
            await sock.sendMessage(from, { text: '📭 No hay boosts activos actualmente.' }, { quoted: msg });
            return;
        }
        const ahora = Date.now();
        let texto = '📊 *Boosts activos:*\n\n';
        for (const efecto in efectosBoost) {
            const mult = efectosBoost[efecto];
            const expira = expiraciones[efecto];
            const restante = expira ? expira - ahora : 0;
            const minutos = Math.floor(restante / 60000);
            const segundos = Math.floor((restante % 60000) / 1000);
            const tiempo = restante > 0 ? `${minutos}m ${segundos}s` : 'desconocido';
            texto += `• ${efecto === 'general' ? '🎲 Suerte general' : efecto} → x${mult} (${tiempo} restante)\n`;
        }
        await sock.sendMessage(from, { text: texto }, { quoted: msg });
        return;
    }

    if (tipo === 'delete' && subarg) {
        if (efectosBoost[subarg]) {
            if (suerteTimeouts[subarg]) clearTimeout(suerteTimeouts[subarg]);
            delete efectosBoost[subarg];
            delete suerteTimeouts[subarg];
            delete expiraciones[subarg];
            await sock.sendMessage(from, { text: `🧹 Se ha eliminado el boost de *${subarg}*.` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: `❌ No hay boost activo para *${subarg}*.` }, { quoted: msg });
        }
        return;
    }

    if (tipo === 'clear') {
        Object.keys(suerteTimeouts).forEach(e => { clearTimeout(suerteTimeouts[e]); });
        efectosBoost = {};
        suerteTimeouts = {};
        expiraciones = {};
        await sock.sendMessage(from, { text: '🧹 Todos los boosts han sido eliminados.' }, { quoted: msg });
        return;
    }

    if (tipo === 'edit') {
        const DURACION_EMOJI = 10 * 60 * 1000;
        const DURACION_LUCK = 15 * 60 * 1000;
        try { await enviarAudioPedo(sock, from, msg); } catch (error) { console.error('Error enviando audio:', error); }
        const efectosActivados = [];
        for (const emoji of Object.keys(multiplicadores)) {
            if (suerteTimeouts[emoji]) clearTimeout(suerteTimeouts[emoji]);
            efectosBoost[emoji] = 2;
            expiraciones[emoji] = Date.now() + DURACION_EMOJI;
            efectosActivados.push(emoji);
            suerteTimeouts[emoji] = setTimeout(() => {
                delete efectosBoost[emoji];
                delete expiraciones[emoji];
                delete suerteTimeouts[emoji];
            }, DURACION_EMOJI);
        }
        if (suerteTimeouts['general']) clearTimeout(suerteTimeouts['general']);
        efectosBoost['general'] = 4;
        expiraciones['general'] = Date.now() + DURACION_LUCK;
        suerteTimeouts['general'] = setTimeout(() => {
            delete efectosBoost['general'];
            delete expiraciones['general'];
            delete suerteTimeouts['general'];
        }, DURACION_LUCK);
        await sock.sendMessage(from, { text: `💥 *Boosts activados masivamente:*\n\n• Emojis (${Object.keys(multiplicadores).length}) → x2 por 10 minutos\n• Suerte general → x4 por 15 minutos` }, { quoted: msg });
        for (const emoji of efectosActivados) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await sock.sendMessage(from, { text: `🎯 *Lukas activó ${emoji} x2!*` });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sock.sendMessage(from, { text: `✨ *¡Todos los efectos han sido activados!* (${efectosActivados.length} efectos)` });
        return;
    }

    const opciones = {
        luck_x2: { multiplicador: 2, duracion: 30 * 60 * 1000 },
        luck_x4: { multiplicador: 4, duracion: 15 * 60 * 1000 },
        luck_x6: { multiplicador: 6, duracion: 8 * 60 * 1000 },
        luck_x8: { multiplicador: 8, duracion: 6 * 60 * 1000 },
        luck_infierno: { multiplicador: 15, duracion: 5 * 60 * 1000 }
    };

    if (tipo.includes('_x')) {
        const efectoMatch = tipo.match(/^(.+)_x(\d+)$/);
        if (!efectoMatch) {
            await sock.sendMessage(from, { text: '❌ Formato inválido. Usa algo como `.activate 🇧🇷_x8`.' }, { quoted: msg });
            return;
        }
        const emoji = efectoMatch[1];
        const mult = parseInt(efectoMatch[2]);
        if (isNaN(mult) || mult < 1 || mult > 15) {
            await sock.sendMessage(from, { text: '❌ Multiplicador inválido. Usa un número entre 1 y 15.' }, { quoted: msg });
            return;
        }
        if (suerteTimeouts[emoji]) clearTimeout(suerteTimeouts[emoji]);
        const DURACION_CUSTOM = 5 * 60 * 1000;
        efectosBoost[emoji] = mult;
        expiraciones[emoji] = Date.now() + DURACION_CUSTOM;
        await sock.sendMessage(from, { text: `🍀 *Suerte activada para ${emoji}*\n\nLa probabilidad de obtener *${emoji}* se ha multiplicado x${mult} durante ${Math.floor(DURACION_CUSTOM / 60000)} minutes.` }, { quoted: msg });
        if (emoji === '🇧🇷') {
            try { await enviarAudioPedo(sock, from, msg); } catch (error) { console.error('Error enviando audio para 🇧🇷:', error); }
        }
        suerteTimeouts[emoji] = setTimeout(() => {
            delete efectosBoost[emoji];
            delete suerteTimeouts[emoji];
            delete expiraciones[emoji];
        }, DURACION_CUSTOM);
        return;
    }

    if (!opciones[tipo]) {
        await sock.sendMessage(from, { text: '❌ Función no válida.\nUsa:\n• `.activate luck_x2`, `luck_x4`, `luck_x6`, `luck_x8`, `luck_infierno`\n• `.activate <efecto>_xN`\n• `.activate delete <efecto>`\n• `.activate clear`\n• `.activate viewboosts`' }, { quoted: msg });
        return;
    }

    if (suerteTimeouts['general']) clearTimeout(suerteTimeouts['general']);
    const { multiplicador, duracion } = opciones[tipo];
    efectosBoost['general'] = multiplicador;
    expiraciones['general'] = Date.now() + duracion;
    await sock.sendMessage(from, { text: `🍀 *Suerte ${tipo.toUpperCase()} activada!*\n\nLas probabilidades de efectos se han multiplicado x${multiplicador} (excepto 💤) durante ${Math.floor(duracion / 60000)} minutes.` }, { quoted: msg });
    suerteTimeouts['general'] = setTimeout(() => {
        delete efectosBoost['general'];
        delete suerteTimeouts['general'];
        delete expiraciones['general'];
    }, duracion);
}

export { getSuerteMultiplicador };
