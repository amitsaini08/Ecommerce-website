import { createServer } from 'http';
import next from 'next';
import { Server } from "socket.io"

import nextEnv from '@next/env';
import jwt from 'jsonwebtoken';

nextEnv.loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch { }
  }
  return out;
}

function getUserFromCookies(cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  const tries = [
    [cookies.access_token, process.env.JWT_SECRET],
    [cookies.refresh_token, process.env.JWT_REFRESH_SECRET],
  ];
  for (const [token, secret] of tries) {
    if (!token || !secret) continue;
    try {
      const d = jwt.verify(token, secret);
      return { id: String(d._id), role: d.role };
    } catch { }
  }
  return null;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);

  globalThis.io = io;

  io.use((socket, nextFn) => {
    socket.data.user = getUserFromCookies(socket.handshake.headers.cookie);
    nextFn();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    if (user) {
      socket.join(`user:${user.id}`);
      if (user.role === 'admin') socket.join('admins');
    }

    socket.on('join-product', (productId) => socket.join(`product:${productId}`));
    socket.on('leave-product', (productId) => socket.leave(`product:${productId}`));
  });

  httpServer.listen(process.env.PORT || 3000, () => {
    console.log('Server ready');
  });
});