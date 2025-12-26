export const command = '67';
export const aliases = ['sixseven', 'seisiete'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  try {

    const videosMiloJ = [
'http://localhost:8000/upload/byvaet10_2025-11-09-15-00-19_1762711219642.mp4',
'http://localhost:8000/upload/vfoxy.com_2025-11-09-15-01-11_1762711271979.mp4',
'http://localhost:8000/upload/lost_end_2025-11-09-15-01-52_1762711312567.mp4',
'http://localhost:8000/upload/rf7_77777_2025-11-09-15-02-27_1762711347694.mp4',
'http://localhost:8000/upload/stezzly.ftbl_2025-11-09-15-02-54_1762711374593.mp4',
'http://localhost:8000/upload/ips.edit_2025-11-09-15-03-53_1762711433700.mp4',
'http://localhost:8000/upload/newslyxz2.0_2025-11-09-15-04-30_1762711470146.mp4'
    ];


    const randomVideo = videosMiloJ[Math.floor(Math.random() * videosMiloJ.length)];

 
    await sock.sendMessage(from, {
      video: { url: randomVideo },
      caption: 'SIX SEVEEN🔥🔥*'
    }, { quoted: msg });

  } catch (err) {
    console.error('Error al enviar el video.', err);
    await sock.sendMessage(from, {
      text: '❌ Ocurrió un error al cargar el video.'
    }, { quoted: msg });
  }
}
