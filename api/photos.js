// api/photos.js
const { google } = require('googleapis');

const FOLDER_ID = '1pUOEE5hqJMgbzgsuM4sHdIXmjVOq5Hc0';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

    // Listar arquivos
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, thumbnailLink, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
    });

    return res.status(200).json({ 
      success: true, 
      files: response.data.files || [] 
    });
  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao carregar fotos'
    });
  }
};