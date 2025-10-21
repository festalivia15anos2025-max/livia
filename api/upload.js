// api/upload.js
const { google } = require('googleapis');
const { IncomingForm } = require('formidable');
const fs = require('fs');

const FOLDER_ID = '1pUOEE5hqJMgbzgsuM4sHdIXmjVOq5Hc0';

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  console.log('=== INÍCIO DO UPLOAD ===');
  console.log('Headers:', req.headers);

  try {
    // Verificar variáveis de ambiente
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    console.log('Email configurado:', process.env.GOOGLE_CLIENT_EMAIL);

    // Configurar Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('Google Drive configurado');

    // Parse do formulário
    const form = new IncomingForm({
      multiples: true,
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
    });

    const uploadedFiles = [];

    const result = await new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Erro no parse do form:', err);
          reject(err);
          return;
        }

        console.log('Arquivos recebidos:', Object.keys(files));

        try {
          // Pegar todos os arquivos
          let allFiles = [];
          for (const key in files) {
            const fileOrArray = files[key];
            if (Array.isArray(fileOrArray)) {
              allFiles = allFiles.concat(fileOrArray);
            } else {
              allFiles.push(fileOrArray);
            }
          }

          console.log(`Total de ${allFiles.length} arquivo(s) para processar`);

          // Upload de cada arquivo
          for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            
            if (!file || !file.filepath) {
              console.log(`Arquivo ${i} inválido, pulando...`);
              continue;
            }

            console.log(`Processando arquivo ${i + 1}/${allFiles.length}: ${file.originalFilename}`);

            const fileName = `festa-livia-${Date.now()}-${i}-${file.originalFilename || 'photo.jpg'}`;

            try {
              const fileStream = fs.createReadStream(file.filepath);

              // Fazer upload SEM especificar parent inicialmente
              const driveResponse = await drive.files.create({
                requestBody: {
                  name: fileName,
                  parents: [FOLDER_ID], // Especificar a pasta compartilhada
                },
                media: {
                  mimeType: file.mimetype || 'image/jpeg',
                  body: fileStream,
                },
                fields: 'id, name, webViewLink',
                supportsAllDrives: true, // IMPORTANTE: suportar drives compartilhados
              });

              console.log(`Arquivo enviado: ${driveResponse.data.id}`);
              uploadedFiles.push(driveResponse.data);

              // Limpar arquivo temporário
              try {
                fs.unlinkSync(file.filepath);
              } catch (cleanupError) {
                console.log('Erro ao limpar temp file:', cleanupError.message);
              }
            } catch (uploadError) {
              console.error(`Erro ao fazer upload do arquivo ${i}:`, uploadError);
              throw uploadError;
            }
          }

          resolve();
        } catch (processError) {
          reject(processError);
        }
      });
    });

    console.log(`=== UPLOAD CONCLUÍDO: ${uploadedFiles.length} arquivo(s) ===`);

    res.status(200).json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error('=== ERRO NO UPLOAD ===');
    console.error('Tipo:', error.constructor.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      type: error.constructor.name,
    });
  }
};
