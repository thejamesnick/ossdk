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
const pg_1 = require("pg");
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
const PORT = process.env.PORT || 3002;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new web3_js_1.PublicKey(process.env.PROGRAM_ID || '4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2');
const connection = new web3_js_1.Connection(RPC_URL, 'confirmed');
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'indexer-service',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// Get events
app.get('/events', async (req, res) => {
    try {
        const { type, address, from, to, limit = 100, offset = 0 } = req.query;
        // Mock response (implement database query in production)
        res.json({
            events: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        logger.error('Error fetching events', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Get supply
app.get('/supply', async (req, res) => {
    try {
        res.json({
            totalSupply: 0,
            decimals: 6,
            formatted: '0.00',
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        logger.error('Error fetching supply', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Get holders
app.get('/holders', async (req, res) => {
    try {
        const { minBalance, limit = 50, offset = 0 } = req.query;
        res.json({
            holders: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        logger.error('Error fetching holders', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
// Get transactions
app.get('/transactions', async (req, res) => {
    try {
        const { address, type, from, to, limit = 100, offset = 0 } = req.query;
        res.json({
            transactions: [],
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }
    catch (error) {
        logger.error('Error fetching transactions', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    logger.info(`Indexer service listening on port ${PORT}`);
    logger.info(`Connected to Solana RPC: ${RPC_URL}`);
    logger.info(`Program ID: ${PROGRAM_ID.toBase58()}`);
});
