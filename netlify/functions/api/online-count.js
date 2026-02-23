const onlineUsers = new Map();
const ONLINE_TIMEOUT = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, lastActivity] of onlineUsers.entries()) {
    if (now - lastActivity > ONLINE_TIMEOUT) {
      onlineUsers.delete(userId);
    }
  }
}, 60000);

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ count: onlineUsers.size })
  };
};
