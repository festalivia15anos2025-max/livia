// api/photos.js
const { v2: cloudinary } = require('cloudinary');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verificar credenciais
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Credenciais do Cloudinary não configuradas');
    }

    // Listar todas as imagens da pasta
    const result = await cloudinary.search
      .expression('folder:festa-livia-15anos')
      .sort_by('created_at', 'desc')
      .max_results(500)
      .execute();

    console.log(`Encontradas ${result.resources.length} fotos`);

    // Formatar as fotos
    const files = result.resources.map((resource) => ({
      id: resource.public_id,
      name: resource.public_id.split('/').pop(),
      thumbnailLink: resource.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill/'),
      webViewLink: resource.secure_url,
      directLink: resource.secure_url,
      createdTime: resource.created_at,
    }));

    return res.status(200).json({
      success: true,
      files: files,
      count: files.length,
    });
  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao carregar fotos',
    });
  }
};
