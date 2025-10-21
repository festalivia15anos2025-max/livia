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
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Listar TODOS os arquivos da pasta (sem filtro de tipo)
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, webContentLink, thumbnailLink, createdTime, mimeType)',
      orderBy: 'createdTime desc',
      pageSize: 1000,
    });

    console.log('Arquivos encontrados:', response.data.files?.length || 0);

    // Processar todos os arquivos
    const files = (response.data.files || []).map((file) => {
      // Gerar thumbnail e link de visualização
      const thumbnailLink = `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`;
      const webViewLink = `https://drive.google.com/file/d/${file.id}/view`;
      const directLink = `https://lh3.googleusercontent.com/d/${file.id}`;

      return {
        id: file.id,
        name: file.name,
        thumbnailLink: thumbnailLink,
        webViewLink: webViewLink,
        directLink: directLink,
        createdTime: file.createdTime,
        mimeType: file.mimeType,
      };
    });

    return res.status(200).json({ 
      success: true, 
      files: files,
      count: files.length
    });
  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao carregar fotos',
      details: error.toString()
    });
  }
};
