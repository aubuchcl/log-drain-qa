const express = require('express');
const fs = require('fs');
const path = require('path');
const split2 = require('split2');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join('/data', 'incoming-posts.log');

// Normal JSON parsing for other endpoints (if needed)
app.use(express.json());

app.post('/data', (req, res) => {
  // Check if it's NDJSON
  const isNDJSON = req.headers['content-type'] === 'application/x-ndjson';

  if (!isNDJSON) {
    return res.status(400).send('Expected application/x-ndjson');
  }

  const logStream = fs.createWriteStream(FILE_PATH, { flags: 'a' });

  req.pipe(split2())
    .on('data', (line) => {
      try {
        if (!line.trim()) return; // skip blank lines
        const obj = JSON.parse(line);
        const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(obj)}\n`;
        logStream.write(logEntry);
        console.log('NDJSON received:', obj);
      } catch (err) {
        console.error('Invalid JSON line:', line);
      }
    })
    .on('end', () => {
      logStream.end();
      res.status(200).send('NDJSON stream processed');
    })
    .on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).send('Error processing stream');
    });
});

app.get('/file', async (req, res) => {
  const filePath = FILE_PATH;
  fs.promises.readFile(filePath, 'utf8')
    .then((contents) => {
      res.set('Content-Type', 'text/plain');
      res.send(contents);
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        res.status(404).send('Log file not found.');
      } else {
        console.error('Read error:', err);
        res.status(500).send('Internal Server Error');
      }
    });
});

app.listen(PORT, () => {
  console.log(`NDJSON-enabled server running on port ${PORT}`);
});
