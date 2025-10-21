// api/upload.js
const { google } = require('googleapis');
const formidable = require('formidable');
const { createReadStream, unlinkSync } = require('fs');

const FOLDER_ID = '1pUOEE5hqJMgbzgsuM4sHdIXmjVOq5Hc0';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Configurar Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Parse form
    const form = formidable({ multiples: true, maxFileSize: 50 * 1024 * 1024 });

    const uploadedFiles = [];

    await new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const fileArray = Array.isArray(files.photos) ? files.photos : [files.photos];

          for (const file of fileArray) {
            if (!file) continue;

            const fileMetadata = {
              name: `festa-livia-${Date.now()}-${file.originalFilename || 'photo.jpg'}`,
              parents: [FOLDER_ID],
            };

            const media = {
              mimeType: file.mimetype || 'image/jpeg',
              body: createReadStream(file.filepath),
            };

            const response = await drive.files.create({
              requestBody: fileMetadata,
              media: media,
              fields: 'id, name, webViewLink',
            });

            uploadedFiles.push(response.data);

            // Limpar arquivo temporário
            try {
              unlinkSync(file.filepath);
            } catch (e) {
              console.log('Erro ao deletar arquivo temporário:', e);
            }
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    return res.status(200).json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao enviar fotos'
    });
  }
};