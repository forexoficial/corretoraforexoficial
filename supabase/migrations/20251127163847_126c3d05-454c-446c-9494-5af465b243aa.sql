-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_trade_balance_insert ON trades;
DROP TRIGGER IF EXISTS trigger_trade_balance_update ON trades;
DROP TRIGGER IF EXISTS on_trade_balance_insert ON trades;
DROP TRIGGER IF EXISTS on_trade_balance_update ON trades;

-- Now drop the functions
DROP FUNCTION IF EXISTS handle_trade_balance_on_insert() CASCADE;
DROP FUNCTION IF EXISTS handle_trade_balance_on_update() CASCADE;

-- Function to handle balance when trade is created (NO deduction)
CREATE OR REPLACE FUNCTION handle_trade_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Do nothing on insert - balance will only be updated when trade closes
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Function to handle balance when trade is updated (deduct amount + add result)
CREATE OR REPLACE FUNCTION handle_trade_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when trade closes (status changes to won or lost)
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    IF NEW.is_demo THEN
      -- Update demo balance: deduct investment and add result
      UPDATE profiles 
      SET demo_balance = demo_balance - NEW.amount + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Update real balance: deduct investment and add result
      UPDATE profiles 
      SET balance = balance - NEW.amount + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create triggers
CREATE TRIGGER trigger_trade_balance_insert
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_balance_on_insert();

CREATE TRIGGER trigger_trade_balance_update
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_balance_on_update();