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
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const userId = body.userId || context.clientContext?.user?.sub || 'unknown-' + Date.now();
    
    onlineUsers.set(userId, Date.now());
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok' })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request' })
    };
  }
};
