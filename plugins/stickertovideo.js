import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const command = 'stovideo';
export const aliases = ['stickertovideo', 'stickervideo'];
export const description = 'Convertir sticker animado a video';

// Método 1: Convertir directamente con ffmpeg
async function convertirConFFmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
            '-an', // Sin audio
            '-y',
            '-t', '3', // Máximo 3 segundos
            outputPath
        ]);

        let errorOutput = '';
        
        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                reject(new Error(`FFmpeg falló: ${errorOutput.substring(0, 200)}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`Error ejecutando FFmpeg: ${err.message}`));
        });

        setTimeout(() => {
            if (ffmpeg.exitCode === null) {
                ffmpeg.kill();
                reject(new Error('Timeout en conversión'));
            }
        }, 10000);
    });
}

// Método 2: Primero extraer frames, luego crear video
async function convertirFramesConFFmpeg(inputPath, outputPath) {
    const framesDir = path.join(tmpdir(), `frames_${Date.now()}`);
    
    try {
        // Crear directorio para frames
        await execAsync(`mkdir -p "${framesDir}"`);
        
        // Extraer frames del WebP
        const extractResult = await execAsync(`ffmpeg -i "${inputPath}" "${framesDir}/frame_%03d.png" 2>&1`);
        
        // Contar frames extraídos
        const files = fs.readdirSync(framesDir);
        if (files.length === 0) {
            throw new Error('No se pudieron extraer frames (probablemente no es animado)');
        }
        
        // Crear video desde frames
        await execAsync(`ffmpeg -framerate 10 -i "${framesDir}/frame_%03d.png" -c:v libx264 -pix_fmt yuv420p -y "${outputPath}" 2>&1`);
        
        // Limpiar frames
        await execAsync(`rm -rf "${framesDir}"`);
        
        return true;
    } catch (error) {
        // Limpiar en caso de error
        try { await execAsync(`rm -rf "${framesDir}"`); } catch {}
        throw error;
    }
}

// Método 3: Usar ImageMagick (si está disponible)
async function convertirConImageMagick(inputPath, outputPath) {
    try {
        // Verificar si ImageMagick está instalado
        await execAsync('convert --version');
        
        // Convertir WebP a GIF primero
        const gifPath = path.join(tmpdir(), `temp_${Date.now()}.gif`);
        await execAsync(`convert "${inputPath}" "${gifPath}"`);
        
        // Convertir GIF a MP4
        await execAsync(`ffmpeg -i "${gifPath}" -movflags +faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -y "${outputPath}"`);
        
        // Limpiar GIF temporal
        try { await unlink(gifPath); } catch {}
        
        return true;
    } catch (error) {
        throw new Error('ImageMagick no está instalado o falló');
    }
}

export async function run(sock, msg, args) {
    const from = msg.key.remoteJid;
    
    const react = async (emoji) => {
        try {
            await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
        } catch {}
    };
    
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = quoted?.quotedMessage;
    
    if (!quotedMsg || !quotedMsg.stickerMessage) {
        await sock.sendMessage(from, { 
            text: `🎬 *STICKER A VIDEO*\n\n⚠️ Responde a un *sticker animado* para convertirlo a video.\n💡 Debe ser un sticker con movimiento (no estático).`
        });
        return;
    }
    
    await react('⏳');
    
    const timestamp = Date.now();
    const tempWebPPath = path.join(tmpdir(), `sticker_${timestamp}.webp`);
    const outputPath = path.join(tmpdir(), `video_${timestamp}.mp4`);
    
    let mediaBuffer;
    
    try {
        console.log('Descargando sticker...');
        
        // Descargar sticker
        mediaBuffer = await downloadMediaMessage(
            { 
                key: { 
                    remoteJid: from, 
                    id: msg.key.id, 
                    fromMe: msg.key.fromMe 
                }, 
                message: quotedMsg 
            },
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
        
        if (!mediaBuffer || mediaBuffer.length === 0) {
            throw new Error('No se pudo descargar el sticker');
        }
        
        console.log(`Sticker descargado: ${mediaBuffer.length} bytes`);
        
        // Guardar temporalmente
        await writeFile(tempWebPPath, mediaBuffer);
        
        // Verificar que sea WebP
        if (!mediaBuffer.slice(0, 12).toString().includes('RIFF') || 
            !mediaBuffer.slice(8, 12).toString().includes('WEBP')) {
            console.log('No es un WebP válido');
            throw new Error('El archivo no es un WebP válido');
        }
        
        let conversionExitosa = false;
        let ultimoError = '';
        
        // PROBAR MÚLTIPLES MÉTODOS
        const metodos = [
            { nombre: 'FFmpeg directo', funcion: convertirConFFmpeg },
            { nombre: 'Extracción de frames', funcion: convertirFramesConFFmpeg },
        ];
        
        // Verificar si ImageMagick está disponible
        try {
            await execAsync('which convert');
            metodos.push({ nombre: 'ImageMagick', funcion: convertirConImageMagick });
        } catch {
            console.log('ImageMagick no disponible');
        }
        
        for (const metodo of metodos) {
            try {
                console.log(`Probando método: ${metodo.nombre}...`);
                await metodo.funcion(tempWebPPath, outputPath);
                
                // Verificar que el video se creó
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    if (stats.size > 0) {
                        console.log(`✅ Conversión exitosa con ${metodo.nombre}`);
                        conversionExitosa = true;
                        break;
                    }
                }
            } catch (error) {
                console.log(`❌ Método ${metodo.nombre} falló:`, error.message);
                ultimoError = error.message;
                // Continuar con el siguiente método
            }
        }
        
        if (!conversionExitosa) {
            throw new Error(`Todos los métodos fallaron. Último error: ${ultimoError}`);
        }
        
        // LEER Y ENVIAR EL VIDEO
        console.log('Leyendo video convertido...');
        const videoBuffer = fs.readFileSync(outputPath);
        
        console.log(`Video tamaño: ${videoBuffer.length} bytes`);
        
        if (videoBuffer.length === 0) {
            throw new Error('El video generado está vacío');
        }
        
        if (videoBuffer.length > 50 * 1024 * 1024) { // 50MB límite de WhatsApp
            throw new Error('El video es demasiado grande para WhatsApp');
        }
        
        // Enviar video
        console.log('Enviando video...');
        await sock.sendMessage(from, {
            video: videoBuffer,
            caption: '🎬 *Sticker convertido a video*\n✅ ¡Conversión exitosa!',
            gifPlayback: false
        }, { quoted: msg });
        
        await react('✅');
        console.log('✅ Video enviado con éxito');
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        await react('❌');
        
        let mensajeError = '';
        
        if (error.message.includes('No se pudo descargar')) {
            mensajeError = `❌ *Error al descargar el sticker*\n\n🔧 Intenta enviar el sticker de nuevo y respóndele.`;
        } else if (error.message.includes('no es un WebP')) {
            mensajeError = `❌ *Formato no soportado*\n\n⚠️ El sticker debe ser formato WebP animado.\n💡 Los stickers de terceros a veces no son compatibles.`;
        } else if (error.message.includes('No se pudieron extraer frames') || 
                  error.message.includes('no es animado')) {
            mensajeError = `❌ *Sticker no animado*\n\n⚠️ Este sticker *no tiene animación*.\n🔍 Solo funcionan stickers que se mueven.`;
        } else if (error.message.includes('FFmpeg') || 
                  error.message.includes('ImageMagick') ||
                  error.message.includes('convert')) {
            mensajeError = `❌ *Error de conversión*\n\n🔧 *Instala las dependencias:*\n`;
            mensajeError += `\`\`\`bash\n`;
            mensajeError += `# En Termux:\n`;
            mensajeError += `pkg install ffmpeg imagemagick -y\n`;
            mensajeError += `\`\`\`\n`;
            mensajeError += `💻 Luego prueba: \`ffmpeg -version\``;
        } else if (error.message.includes('Timeout')) {
            mensajeError = `⏰ *Tiempo agotado*\n\n💡 El sticker es muy complejo.\n🔧 Intenta con uno más corto.`;
        } else if (error.message.includes('demasiado grande')) {
            mensajeError = `📦 *Video muy grande*\n\n⚠️ WhatsApp no permite videos >50MB.\n💡 Intenta con un sticker más corto.`;
        } else {
            mensajeError = `❌ *Error desconocido*\n\n📄 ${error.message}\n\n🔧 Reporta este error al desarrollador.`;
        }
        
        await sock.sendMessage(from, { 
            text: mensajeError 
        });
        
    } finally {
        // LIMPIAR ARCHIVOS TEMPORALES
        try {
            if (fs.existsSync(tempWebPPath)) {
                await unlink(tempWebPPath);
                console.log('🗑️ WebP temporal eliminado');
            }
            if (fs.existsSync(outputPath)) {
                await unlink(outputPath);
                console.log('🗑️ Video temporal eliminado');
            }
        } catch (e) {
            console.error('Error limpiando archivos:', e);
        }
    }
}