const express = require('express');
const fs = require('fs');
const path = require('path');
const split2 = require('split2');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH = path.join('/data', 'incoming-posts.log');

// Shared write stream for all incoming data
const logStream = fs.createWriteStream(FILE_PATH, { flags: 'a' });

// Allow JSON parsing for future extensibility
app.use(express.json());

app.post('/data', (req, res) => {
  const contentType = req.headers['content-type'];

  // NDJSON streaming
  if (contentType === 'application/x-ndjson') {
    req.pipe(split2())
      .on('data', (line) => {
        try {
          if (!line.trim()) return;
          const obj = JSON.parse(line);
          const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(obj)}\n`;

          if (!logStream.write(logEntry)) {
            req.pause();
            logStream.once('drain', () => req.resume());
          }

          console.log('NDJSON received:', obj);
        } catch (err) {
          console.error('Invalid NDJSON line:', line);
        }
      })
      .on('end', () => {
        res.status(200).send('NDJSON stream processed');
      })
      .on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).send('Error processing stream');
      });

  // Standard JSON (single POST payload)
  } else if (contentType === 'application/json') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const json = JSON.parse(body);
        const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(json)}\n`;

        await fs.promises.appendFile(FILE_PATH, logEntry);
        console.log('JSON received:', json);

        res.status(200).send('JSON logged');
      } catch (err) {
        console.error('Invalid JSON:', err);
        res.status(400).send('Invalid JSON body');
      }
    });

    req.on('error', (err) => {
      console.error('Request stream error:', err);
      res.status(500).send('Request error');
    });

  } else {
    res.status(415).send('Unsupported content-type');
  }
});

// Streamed file reader (GET /file)
app.get('/file', (req, res) => {
  const readStream = fs.createReadStream(FILE_PATH);

  readStream.on('error', (err) => {
    if (err.code === 'ENOENT') {
      res.status(404).send('Log file not found.');
    } else {
      console.error('Failed to read file:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  res.set('Content-Type', 'text/plain');
  readStream.pipe(res);
});

app.listen(PORT, () => {
  console.log(`NDJSON+JSON server running on port ${PORT}`);
});
