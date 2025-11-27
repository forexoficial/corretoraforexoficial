-- Adicionar campos para personalizar as linhas de entrada de operações
ALTER TABLE chart_appearance_settings
ADD COLUMN IF NOT EXISTS trade_line_call_color TEXT DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS trade_line_put_color TEXT DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS trade_line_width INTEGER DEFAULT 2 CHECK (trade_line_width >= 1 AND trade_line_width <= 5),
ADD COLUMN IF NOT EXISTS trade_line_style INTEGER DEFAULT 2 CHECK (trade_line_style >= 0 AND trade_line_style <= 3),
ADD COLUMN IF NOT EXISTS trade_line_show_label BOOLEAN DEFAULT true;

COMMENT ON COLUMN chart_appearance_settings.trade_line_call_color IS 'Cor da linha de entrada para operações de COMPRA (CALL)';
COMMENT ON COLUMN chart_appearance_settings.trade_line_put_color IS 'Cor da linha de entrada para operações de VENDA (PUT)';
COMMENT ON COLUMN chart_appearance_settings.trade_line_width IS 'Espessura da linha de entrada (1-5)';
COMMENT ON COLUMN chart_appearance_settings.trade_line_style IS 'Estilo da linha: 0=sólida, 1=pontilhada, 2=tracejada, 3=traço grande';
COMMENT ON COLUMN chart_appearance_settings.trade_line_show_label IS 'Mostrar/ocultar label COMPRA/VENDA na linha';