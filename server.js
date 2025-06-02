const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join('/data', 'incoming-posts.log');

app.use(express.json());

app.post('/data', async (req, res) => {
  const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(req.body)}\n`;

  try {
    await fs.appendFile(FILE_PATH, logEntry);
    console.log('POST /data:', req.body);
    res.status(200).send('Data logged');
  } catch (err) {
    console.error('Failed to write to file:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/file', async (req, res) => {
  try {
    const contents = await fs.readFile(FILE_PATH, 'utf8');
    res.set('Content-Type', 'text/plain');
    res.send(contents);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('Log file not found.');
    } else {
      console.error('Failed to read file:', err);
      res.status(500).send('Internal Server Error');
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
