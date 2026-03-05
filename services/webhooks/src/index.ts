import express from 'express';
import { createClient } from 'redis';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

dotenv.config();

const app = express();
app.use(express.json());

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const PORT = process.env.PORT || 3004;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Optional Redis connection
let redisClient: any = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.connect().catch((err: any) => {
    logger.warn('Redis connection failed, using in-memory storage', { error: err.message });
    redisClient = null;
  });
} else {
  logger.warn('No Redis configured - using in-memory storage');
}

// In-memory webhook store (use Redis in production)
const webhooks = new Map<string, any>();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'webhook-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Register webhook
app.post('/webhooks/register', async (req, res) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events) {
      return res.status(400).json({ error: 'Missing required fields: url, events' });
    }

    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const webhook = {
      webhookId,
      url,
      events,
      secret,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    webhooks.set(webhookId, webhook);
    
    logger.info('Webhook registered', { webhookId, url, events });

    res.json(webhook);
  } catch (error: any) {
    logger.error('Error registering webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete webhook
app.delete('/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhooks.has(webhookId)) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    webhooks.delete(webhookId);
    
    logger.info('Webhook deleted', { webhookId });

    res.json({
      success: true,
      webhookId,
      deletedAt: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error deleting webhook', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// List webhooks
app.get('/webhooks/list', async (req, res) => {
  try {
    const webhookList = Array.from(webhooks.values());
    
    res.json({
      webhooks: webhookList,
      total: webhookList.length
    });
  } catch (error: any) {
    logger.error('Error listing webhooks', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get webhook deliveries
app.get('/webhooks/:webhookId/deliveries', async (req, res) => {
  try {
    const { webhookId } = req.params;

    if (!webhooks.has(webhookId)) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      deliveries: [],
      total: 0
    });
  } catch (error: any) {
    logger.error('Error fetching deliveries', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Send webhook (internal function)
async function sendWebhook(webhookId: string, event: string, data: any) {
  const webhook = webhooks.get(webhookId);
  if (!webhook) return;

  try {
    const payload = {
      webhookId,
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'signature_placeholder'
      },
      timeout: 10000
    });

    logger.info('Webhook delivered', { webhookId, event });
  } catch (error: any) {
    logger.error('Webhook delivery failed', { webhookId, event, error: error.message });
    // Implement retry logic here
  }
}

app.listen(PORT, () => {
  logger.info(`Webhook service listening on port ${PORT}`);
  logger.info(`Connected to Redis: ${REDIS_URL}`);
});
