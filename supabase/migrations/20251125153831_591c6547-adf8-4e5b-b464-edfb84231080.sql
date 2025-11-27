-- Insert Crypto assets
INSERT INTO assets (name, symbol, payout_percentage, icon_url, is_active) VALUES
('Ethereum (OTC)', 'ETH-OTC', 90, 'https://cryptologos.cc/logos/ethereum-eth-logo.png', true),
('Litecoin (OTC)', 'LTC-OTC', 88, 'https://cryptologos.cc/logos/litecoin-ltc-logo.png', true),
('Ripple (OTC)', 'XRP-OTC', 87, 'https://cryptologos.cc/logos/xrp-xrp-logo.png', true),
('Cardano (OTC)', 'ADA-OTC', 86, 'https://cryptologos.cc/logos/cardano-ada-logo.png', true),
('Solana (OTC)', 'SOL-OTC', 89, 'https://cryptologos.cc/logos/solana-sol-logo.png', true),
('Dogecoin (OTC)', 'DOGE-OTC', 85, 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', true),
('Polkadot (OTC)', 'DOT-OTC', 87, 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png', true),
('Avalanche (OTC)', 'AVAX-OTC', 88, 'https://cryptologos.cc/logos/avalanche-avax-logo.png', true),
('BNB (OTC)', 'BNB-OTC', 89, 'https://cryptologos.cc/logos/bnb-bnb-logo.png', true),
('Polygon (OTC)', 'MATIC-OTC', 86, 'https://cryptologos.cc/logos/polygon-matic-logo.png', true);

-- Insert Forex assets
INSERT INTO assets (name, symbol, payout_percentage, icon_url, is_active) VALUES
('EUR/USD (OTC)', 'EUR-USD-OTC', 91, NULL, true),
('GBP/USD (OTC)', 'GBP-USD-OTC', 90, NULL, true),
('USD/JPY (OTC)', 'USD-JPY-OTC', 89, NULL, true),
('AUD/USD (OTC)', 'AUD-USD-OTC', 88, NULL, true),
('USD/CAD (OTC)', 'USD-CAD-OTC', 88, NULL, true),
('NZD/USD (OTC)', 'NZD-USD-OTC', 87, NULL, true),
('EUR/GBP (OTC)', 'EUR-GBP-OTC', 89, NULL, true),
('GBP/JPY (OTC)', 'GBP-JPY-OTC', 88, NULL, true),
('EUR/JPY (OTC)', 'EUR-JPY-OTC', 89, NULL, true),
('AUD/JPY (OTC)', 'AUD-JPY-OTC', 87, NULL, true);

-- Insert Stock assets
INSERT INTO assets (name, symbol, payout_percentage, icon_url, is_active) VALUES
('Apple Inc.', 'AAPL', 92, 'https://logo.clearbit.com/apple.com', true),
('Alphabet Inc.', 'GOOGL', 91, 'https://logo.clearbit.com/google.com', true),
('Tesla Inc.', 'TSLA', 93, 'https://logo.clearbit.com/tesla.com', true),
('Amazon.com Inc.', 'AMZN', 91, 'https://logo.clearbit.com/amazon.com', true),
('Microsoft Corp.', 'MSFT', 90, 'https://logo.clearbit.com/microsoft.com', true),
('Meta Platforms', 'META', 90, 'https://logo.clearbit.com/meta.com', true),
('Netflix Inc.', 'NFLX', 89, 'https://logo.clearbit.com/netflix.com', true),
('NVIDIA Corp.', 'NVDA', 92, 'https://logo.clearbit.com/nvidia.com', true),
('AMD Inc.', 'AMD', 88, 'https://logo.clearbit.com/amd.com', true),
('Intel Corp.', 'INTC', 87, 'https://logo.clearbit.com/intel.com', true);

-- Insert Commodities
INSERT INTO assets (name, symbol, payout_percentage, icon_url, is_active) VALUES
('Gold (OTC)', 'XAU-OTC', 90, NULL, true),
('Silver (OTC)', 'XAG-OTC', 88, NULL, true),
('Oil WTI (OTC)', 'WTI-OTC', 89, NULL, true),
('Oil Brent (OTC)', 'BRENT-OTC', 89, NULL, true),
('Natural Gas (OTC)', 'NGAS-OTC', 87, NULL, true);