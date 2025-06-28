const axios = require('axios');
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-filename');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end(`Method ${req.method} Not Allowed`);

  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('error', (err) => {
    console.error('Error while receiving data:', err);
    return res.status(500).json({ error: 'Error receiving file data' });
  });

  req.on('end', async () => {
    const buffer = Buffer.concat(chunks);

    // Debugging: Log buffer size
    console.log(`Received buffer size: ${buffer.length} bytes`);
    
    const fileName = req.headers['x-filename'];
    if (!fileName) {
      console.error('x-filename header missing');
      return res.status(400).json({ error: 'Header x-filename wajib diisi' });
    }
    
    if (!buffer || buffer.length === 0) {
      console.error('Empty buffer received');
      return res.status(400).json({ error: 'Body buffer wajib diisi' });
    }

    const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
    const randomName = crypto.randomBytes(4).toString('hex');
    const newFileName = `${randomName}.${extension}`;

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: 'GITHUB_TOKEN belum diset di environment variables' });
    }

    const repoOwner = 'klandestin-s';
    const repoName = 'Cloud_v2';
    const branch = 'main';
    const folderName = 'tmp';
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderName}/${newFileName}`;

    try {
      const base64Content = buffer.toString('base64');

      const response = await axios.put(url, {
        message: 'Upload file via buffer',
        content: base64Content,
      }, {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return res.status(200).json({
        success: 200,
        author: 'klandestin-s',
        data: {
          message: 'File berhasil diupload ke GitHub',
          fileName: newFileName,
          extension: extension,
          url: `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${folderName}/${newFileName}`
        }
      });
    } catch (err) {
      console.error('Error uploading to GitHub:', err);
      return res.status(500).json({
        error: 'Gagal upload ke GitHub',
        detail: err.response?.data || err.message,
      });
    }
  });
};
