import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

dotenv.config();

const app = express();
app.use(express.json());

// Logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
  ],
});

// Configuration
const PORT = process.env.PORT || 3001;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || '4x5WYd89RdGgHRbt4qDt9ntvshKferBcaSwk2QWSh3q2');

const connection = new Connection(RPC_URL, 'confirmed');

// In-memory request store (use database in production)
const requests = new Map<string, any>();

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
  } catch (error: any) {
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
  } catch (error: any) {
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
