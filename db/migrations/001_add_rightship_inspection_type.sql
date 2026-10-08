-- RightShip Preparation inspection category (RISQ v3.2).
-- db/schema.sql already mirrors this.
ALTER TYPE inspection_type ADD VALUE IF NOT EXISTS 'RIGHTSHIP';
