-- Create databases
CREATE DATABASE IF NOT EXISTS sss_indexer;
CREATE DATABASE IF NOT EXISTS sss_compliance;

-- Connect to indexer database
\c sss_indexer;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    stablecoin VARCHAR(44) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    tx_signature VARCHAR(88) NOT NULL,
    slot BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_stablecoin ON events(stablecoin);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    signature VARCHAR(88) UNIQUE NOT NULL,
    tx_type VARCHAR(20) NOT NULL,
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    amount BIGINT,
    timestamp TIMESTAMP NOT NULL,
    slot BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_from ON transactions(from_address);
CREATE INDEX idx_transactions_to ON transactions(to_address);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);

-- Connect to compliance database
\c sss_compliance;

-- Blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
    id SERIAL PRIMARY KEY,
    stablecoin VARCHAR(44) NOT NULL,
    address VARCHAR(44) NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB,
    added_by VARCHAR(44) NOT NULL,
    added_at TIMESTAMP NOT NULL,
    removed_at TIMESTAMP,
    tx_signature VARCHAR(88),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stablecoin, address)
);

CREATE INDEX idx_blacklist_address ON blacklist(address);
CREATE INDEX idx_blacklist_stablecoin ON blacklist(stablecoin);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    stablecoin VARCHAR(44) NOT NULL,
    address VARCHAR(44),
    amount BIGINT,
    reason TEXT,
    performed_by VARCHAR(44) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    tx_signature VARCHAR(88),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_address ON audit_log(address);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
