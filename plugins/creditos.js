export const command = 'creditos';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  const imageUrl = 'http://localhost:8000/upload/IMG-20250810-WA0248(1).jpg';

  const texto = `
┏━━━━━━━━━━━━━━━━━━━┓
👑 *Owners:*
+56 9 5350 8566 > Lukas
+52 55 3883 0665 > Miguelito
+52 951 316 4242 > Lilan
+56 9 3061 7575 > Tom

🌐 *Instagram:*
Bot🐼:
https://www.instagram.com/panda.bot2025?igsh=MW1ydDJ1ODJjbzBxNA==

Creador❗️:
https://www.instagram.com/lukas.sec_._?igsh=MWhocXdvZGt5cGtldA==

Owners👑:

https://www.instagram.com/miangelnevado?igsh=MWk5cGcxem5zN3p3bA==
> Miguelito

https://www.instagram.com/awendoperez?igsh=MWZqeDQzYWYyN2JrMw==
> Lilan

https://www.instagram.com/sigmatom777?igsh=cmc4eWgxMmR3b2Nq
> Tom

> Gracias por todo.💗
┗━━━━━━━━━━━━━━━━━━━┛
`.trim();

  await sock.sendMessage(from, {
    image: { url: imageUrl },
    caption: texto
  }, { quoted: msg });
}
