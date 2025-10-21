module.exports = function handler(req, res) {
  const hasEmail = !!process.env.GOOGLE_CLIENT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;
  const emailValue = process.env.GOOGLE_CLIENT_EMAIL;
  const keyStart = process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50);
  
  res.status(200).json({ 
    hasEmail,
    hasKey,
    email: emailValue,
    keyPreview: keyStart,
    message: 'Se hasEmail e hasKey forem false, as variáveis não estão configuradas'
  });
};
```