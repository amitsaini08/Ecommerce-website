export function broadcast(productId, event, payload, exceptSocketId) {
  const io = globalThis.io;
  if (!io) return;
  let target = io.to(`product:${productId}`);
  if (exceptSocketId) target = target.except(exceptSocketId);
  target.emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  globalThis.io?.to(`user:${String(userId)}`).emit(event, payload);
}