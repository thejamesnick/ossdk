import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { Pool } from 'pg';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'compliance.log' })
  ]
});

// Database connection (optional)
let pool: Pool | null = null;

if (process.env.DATABASE_URL || process.env.DB_HOST) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sss_compliance',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });
  logger.info('Database connection configured');
} else {
  logger.warn('No database configured - using in-memory storage');
}

// In-memory storage fallback
const inMemoryEvents: ComplianceEvent[] = [];

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
);

// Types
interface ScreeningResult {
  address: string;
  isMatch: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  details?: string;
  matchScore?: number;
  sanctionsList?: string;
}

interface ComplianceEvent {
  type: string;
  address: string;
  amount?: number;
  reason?: string;
  timestamp: number;
  authority?: string;
  txSignature?: string;
  metadata?: Record<string, any>;
}

// Sanctions screening
async function screenAddress(address: string): Promise<ScreeningResult> {
  try {
    // Check against OFAC SDN list (mock implementation)
    const ofacList = process.env.OFAC_API_URL;
    
    if (!ofacList) {
      logger.warn('OFAC API not configured, skipping screening');
      return {
        address,
        isMatch: false,
        riskLevel: 'low'
      };
    }

    // In production, integrate with actual sanctions screening API
    // For now, return mock result
    return {
      address,
      isMatch: false,
      riskLevel: 'low'
    };
  } catch (error) {
    logger.error('Screening error:', error);
    throw error;
  }
}

// Store compliance event
async function storeComplianceEvent(event: ComplianceEvent): Promise<void> {
  if (pool) {
    const query = `
      INSERT INTO compliance_events 
      (type, address, amount, reason, timestamp, authority, tx_signature, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await pool.query(query, [
      event.type,
      event.address,
      event.amount,
      event.reason,
      event.timestamp,
      event.authority,
      event.txSignature,
      JSON.stringify(event.metadata)
    ]);
  } else {
    // Use in-memory storage
    inMemoryEvents.push(event);
  }
  
  logger.info('Compliance event stored', event);
}

// Transaction monitoring
async function monitorTransaction(tx: any): Promise<void> {
  const flags: string[] = [];
  
  // Large transaction check
  if (tx.amount > 10_000_000_000) {
    flags.push('large_transaction');
  }
  
  // Get recent transactions for pattern detection
  let recentTxs: any;
  
  if (pool) {
    const recentQuery = `
      SELECT * FROM compliance_events 
      WHERE address = $1 AND timestamp > $2
      ORDER BY timestamp DESC
    `;
    recentTxs = await pool.query(recentQuery, [
      tx.address,
      Date.now() - 3600000 // Last hour
    ]);
  } else {
    // Use in-memory storage
    const cutoff = Date.now() - 3600000;
    recentTxs = {
      rows: inMemoryEvents.filter(e => e.address === tx.address && e.timestamp > cutoff)
    };
  }
  
  // Rapid succession check
  if (recentTxs.rows.length > 10) {
    flags.push('rapid_transactions');
  }
  
  if (flags.length > 0) {
    logger.warn('Suspicious activity detected', { address: tx.address, flags });
    
    await storeComplianceEvent({
      type: 'suspicious_activity',
      address: tx.address,
      amount: tx.amount,
      reason: flags.join(', '),
      timestamp: Date.now(),
      metadata: { flags, transaction: tx }
    });
  }
}

// API Routes
app.post('/screen', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }
    
    // Validate Solana address
    try {
      new PublicKey(address);
    } catch {
      return res.status(400).json({ error: 'Invalid Solana address' });
    }
    
    const result = await screenAddress(address);
    
    // Store screening event
    await storeComplianceEvent({
      type: 'address_screened',
      address,
      timestamp: Date.now(),
      metadata: result
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Screen endpoint error:', error);
    res.status(500).json({ error: 'Screening failed' });
  }
});

app.post('/event', async (req, res) => {
  try {
    const event: ComplianceEvent = req.body;
    
    if (!event.type || !event.address) {
      return res.status(400).json({ error: 'Type and address required' });
    }
    
    await storeComplianceEvent(event);
    
    // Monitor for suspicious activity
    if (event.type === 'transfer' || event.type === 'mint') {
      await monitorTransaction(event);
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Event endpoint error:', error);
    res.status(500).json({ error: 'Event storage failed' });
  }
});

app.get('/audit-log', async (req, res) => {
  try {
    const { address, from, to, type } = req.query;
    
    let results: any[];
    
    if (pool) {
      let query = 'SELECT * FROM compliance_events WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;
      
      if (address) {
        query += ` AND address = $${paramCount++}`;
        params.push(address);
      }
      
      if (from) {
        query += ` AND timestamp >= $${paramCount++}`;
        params.push(parseInt(from as string));
      }
      
      if (to) {
        query += ` AND timestamp <= $${paramCount++}`;
        params.push(parseInt(to as string));
      }
      
      if (type) {
        query += ` AND type = $${paramCount++}`;
        params.push(type);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT 1000';
      
      const result = await pool.query(query, params);
      results = result.rows;
    } else {
      // Use in-memory storage
      results = inMemoryEvents.filter(event => {
        if (address && event.address !== address) return false;
        if (from && event.timestamp < parseInt(from as string)) return false;
        if (to && event.timestamp > parseInt(to as string)) return false;
        if (type && event.type !== type) return false;
        return true;
      }).slice(0, 1000);
    }
    
    res.json(results);
  } catch (error) {
    logger.error('Audit log endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'compliance' });
});

// Initialize database
async function initDatabase() {
  if (!pool) {
    logger.info('Skipping database initialization - using in-memory storage');
    return;
  }
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS compliance_events (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      address VARCHAR(44) NOT NULL,
      amount BIGINT,
      reason TEXT,
      timestamp BIGINT NOT NULL,
      authority VARCHAR(44),
      tx_signature VARCHAR(88),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_address ON compliance_events(address);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON compliance_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_type ON compliance_events(type);
  `;
  
  await pool.query(createTableQuery);
  logger.info('Database initialized');
}

// Start server
const PORT = process.env.PORT || 3003;

async function start() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Compliance service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();
