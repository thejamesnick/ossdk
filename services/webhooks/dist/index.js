"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const redis_1 = require("redis");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const winston_1 = require("winston");
dotenv.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
    transports: [new winston_1.transports.Console()],
});
const PORT = process.env.PORT || 3004;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = (0, redis_1.createClient)({ url: REDIS_URL });
redisClient.connect().catch(console.error);
// In-memory webhook store (use Redis in production)
const webhooks = new Map();
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        logger.error('Error fetching deliveries', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Send webhook (internal function)
async function sendWebhook(webhookId, event, data) {
    const webhook = webhooks.get(webhookId);
    if (!webhook)
        return;
    try {
        const payload = {
            webhookId,
            event,
            timestamp: new Date().toISOString(),
            data,
        };
        await axios_1.default.post(webhook.url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': 'signature_placeholder'
            },
            timeout: 10000
        });
        logger.info('Webhook delivered', { webhookId, event });
    }
    catch (error) {
        logger.error('Webhook delivery failed', { webhookId, event, error: error.message });
        // Implement retry logic here
    }
}
app.listen(PORT, () => {
    logger.info(`Webhook service listening on port ${PORT}`);
    logger.info(`Connected to Redis: ${REDIS_URL}`);
});
