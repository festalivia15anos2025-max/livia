// api/upload.js
const { v2: cloudinary } = require('cloudinary');
const { IncomingForm } = require('formidable');
const fs = require('fs');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  console.log('=== INÍCIO DO UPLOAD ===');

  try {
    // Verificar variáveis de ambiente
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Credenciais do Cloudinary não configuradas');
    }

    // Parse do formulário
    const form = new IncomingForm({
      multiples: true,
      maxFileSize: 50 * 1024 * 1024,
      keepExtensions: true,
    });

    const uploadedFiles = [];

    await new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Erro no parse:', err);
          reject(err);
          return;
        }

        try {
          console.log('Arquivos recebidos:', Object.keys(files));

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

            try {
              // Upload para Cloudinary
              const result = await cloudinary.uploader.upload(file.filepath, {
                folder: 'festa-livia-15anos',
                public_id: `foto-${Date.now()}-${i}`,
                resource_type: 'auto',
                tags: ['festa', 'livia', '15anos'],
              });

              console.log(`Arquivo enviado: ${result.public_id}`);

              uploadedFiles.push({
                id: result.public_id,
                name: file.originalFilename || `foto-${i}.jpg`,
                url: result.secure_url,
                thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
                createdTime: new Date().toISOString(),
              });

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
    console.error('Mensagem:', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
