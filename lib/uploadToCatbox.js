import fetch from 'node-fetch';
import FormData from 'form-data';

/**
 * Sube un archivo a Catbox y devuelve la URL directa
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<string>}
 */
export async function uploadToCatbox(buffer, filename = 'file') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer inválido para Catbox');
  }

  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, filename);

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
  });

  const text = await res.text();

  if (!text.startsWith('https://')) {
    throw new Error('Catbox falló: ' + text);
  }

  return text.trim();
}