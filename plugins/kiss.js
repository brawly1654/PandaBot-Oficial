export const command = 'kiss';

import { trackBeso } from '../middleware/trackAchievements.js';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;


  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  let who;

  if (mentions.length > 0) {
    who = mentions[0];
  } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
    who = msg.message.extendedTextMessage.contextInfo.participant;
  } else {
    who = msg.key.participant || msg.key.remoteJid;
  }

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = (senderJid || '').split('@')[0];
  const targetNumber = who ? who.split('@')[0] : null;

  let str;
  if (who && who !== senderJid) {
    str = `@${senderNumber} le dio besos a @${targetNumber} ( ˘ ³˘)♥.`;
  } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage && who) {
    str = `@${senderNumber} besó a @${targetNumber} 💋.`;
  } else {
    str = `@${senderNumber} se besó a sí mismo ( ˘ ³˘)♥`;
  }

 
  const videos = [
    'https://telegra.ph/file/d6ece99b5011aedd359e8.mp4',
    'https://telegra.ph/file/ba841c699e9e039deadb3.mp4',
    'https://telegra.ph/file/6497758a122357bc5bbb7.mp4',
    'https://telegra.ph/file/8c0f70ed2bfd95a125993.mp4',
    'https://telegra.ph/file/826ce3530ab20b15a496d.mp4',
    'https://telegra.ph/file/f66bcaf1effc14e077663.mp4',
    'https://telegra.ph/file/e1dbfc56e4fcdc3896f08.mp4',
    'https://telegra.ph/file/0fc525a0d735f917fd25b.mp4',
    'https://telegra.ph/file/68643ac3e0d591b0ede4f.mp4',
    'https://telegra.ph/file/af0fe6eb00bd0a8a9e3a0.mp4'
  ];
  const video = videos[Math.floor(Math.random() * videos.length)];

  try {

    const mentionList = [];
    if (senderJid) mentionList.push(senderJid);
    if (who && who !== senderJid) mentionList.push(who);

    await sock.sendMessage(from, {
      video: { url: video },
      gifPlayback: true,
      caption: str,
      mentions: mentionList
    }, { quoted: msg });
    try { trackBeso(senderJid, sock, from); } catch (e) {}
  } catch (e) {
    console.error('❌ Error al enviar kiss:', e);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error.' });
  }
}
