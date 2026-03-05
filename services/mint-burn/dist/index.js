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
const web3_js_1 = require("@solana/web3.js");
const dotenv = __importStar(require("dotenv"));
const winston_1 = require("winston");
dotenv.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Logger
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
    transports: [
        new winston_1.transports.Console(),
    ],
});
// Configuration
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new web3_js_1.PublicKey(process.env.PROGRAM_ID || '4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2');
const connection = new web3_js_1.Connection(RPC_URL, 'confirmed');
// In-memory request store (use database in production)
const requests = new Map();
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'mint-burn-service',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// Request mint
app.post('/mint/request', async (req, res) => {
    try {
        const { recipient, amount, reference } = req.body;
        if (!recipient || !amount) {
            return res.status(400).json({ error: 'Missing required fields: recipient, amount' });
        }
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mintRequest = {
            requestId,
            recipient,
            amount,
            reference,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        requests.set(requestId, mintRequest);
        logger.info('Mint request created', { requestId, recipient, amount });
        res.json(mintRequest);
    }
    catch (error) {
        logger.error('Error creating mint request', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Request burn
app.post('/burn/request', async (req, res) => {
    try {
        const { owner, amount, reference } = req.body;
        if (!owner || !amount) {
            return res.status(400).json({ error: 'Missing required fields: owner, amount' });
        }
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const burnRequest = {
            requestId,
            owner,
            amount,
            reference,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        requests.set(requestId, burnRequest);
        logger.info('Burn request created', { requestId, owner, amount });
        res.json(burnRequest);
    }
    catch (error) {
        logger.error('Error creating burn request', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Get request status
app.get('/mint/status/:requestId', (req, res) => {
    const { requestId } = req.params;
    const request = requests.get(requestId);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
});
app.get('/burn/status/:requestId', (req, res) => {
    const { requestId } = req.params;
    const request = requests.get(requestId);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    res.json(request);
});
// Start server
app.listen(PORT, () => {
    logger.info(`Mint/Burn service listening on port ${PORT}`);
    logger.info(`Connected to Solana RPC: ${RPC_URL}`);
    logger.info(`Program ID: ${PROGRAM_ID.toBase58()}`);
});
//# sourceMappingURL=index.js.map