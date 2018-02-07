'use strict';

const fs = require('fs')
const http2 = require('http2')
const path = require('path')
const pino = require('pino')()

const key = fs.readFileSync('./jasnell-key.pem')
const cert = fs.readFileSync('./jasnell-cert.pem')

const server = http2.createSecureServer({ key, cert })
server.on('stream', (stream, headers) => {
  let p = headers[':path']
  if (p === '/' || p === '/index') {
    p = '/index.html'

    fs.readdir('./media', (err, items) => {
      items.forEach((i) => {
        const file = `/media/${i}`
        stream.pushStream({ ':path': file }, (err, stream) => {
          stream.respondWithFile(`.${file}`)
        })
      });
    });

  }
  const localPath = path.resolve(__dirname, `.${p}`)
  fs.stat(localPath, (err, stat) => {
    if (err) {
      pino.error({ ':path': p, 'root': localPath }, '404')
      stream.respond({ ':status': 404 })
      stream.end('Not Found')
      return
    }
    pino.info({ ':path': p, 'root': localPath }, '200')
    stream.respond()
    const readStream = fs.createReadStream(localPath)
    readStream.pipe(stream)
  })
})

server.listen(8888, () => {
  pino.info('HTTP/2 Server is listening on port 8888')
})
