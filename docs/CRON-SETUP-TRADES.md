# Configuração do Cron Job para Processar Trades Expiradas

## ⚠️ IMPORTANTE: Este cron job é essencial para o funcionamento correto do sistema de trades!

O sistema de trades precisa de um cron job que rode automaticamente a cada minuto para:
- Fechar trades expiradas
- Calcular se o trader ganhou ou perdeu (won/lost)
- Atualizar o saldo do usuário automaticamente
- Limpar as linhas horizontais do gráfico

## Como Configurar

### 1. Acesse o Supabase Dashboard
Vá para: https://supabase.com/dashboard/project/xhmisqcngalyjapkdwvh/sql/new

### 2. Cole e Execute o SQL Abaixo

```sql
-- Configurar cron job para processar trades expiradas a cada minuto
SELECT cron.schedule(
  'process-expired-trades-every-minute',
  '* * * * *',  -- Executa a cada minuto
  $$
  SELECT
    net.http_post(
        url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/process-expired-trades',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

### 3. Verificar se o Cron Job foi Criado

Execute este comando para ver todos os cron jobs:
```sql
SELECT * FROM cron.job ORDER BY jobname;
```

Você deve ver o job `process-expired-trades-every-minute` na lista.

### 4. Verificar Histórico de Execução

Para ver o histórico de execuções do cron job:
```sql
SELECT * 
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-expired-trades-every-minute')
ORDER BY start_time DESC 
LIMIT 20;
```

## Como o Sistema Funciona

### Quando o Trader Cria uma Operação:

1. **Linha Horizontal Verde/Vermelha**: Aparece no gráfico no preço de entrada
   - Verde para operações de COMPRA (call)
   - Vermelha para operações de VENDA (put)

2. **Cronômetro**: Aparece na lateral direita mostrando o tempo restante

3. **Dados Salvos no Banco**:
   - `entry_price`: Preço de entrada (usado para desenhar a linha)
   - `expires_at`: Momento em que a operação expira
   - `duration_minutes`: Duração da operação
   - `status`: 'open' (enquanto não expirar)

### Quando a Operação Expira:

O cron job executa a edge function `process-expired-trades` que:

1. **Busca todas as trades abertas** com `expires_at < now()`
2. **Calcula o resultado**:
   - Pega o preço de fechamento no momento da expiração
   - Compara com o preço de entrada
   - Para CALL: ganhou se preço subiu
   - Para PUT: ganhou se preço desceu
3. **Atualiza a trade**:
   - `status`: 'won' ou 'lost'
   - `result`: valor ganho (+) ou perdido (-)
   - `closed_at`: momento do fechamento
4. **Atualiza o saldo do usuário**:
   - Se ganhou: adiciona o payout ao saldo
   - Se perdeu: já havia deduzido o valor no momento da criação
5. **Remove a linha do gráfico**: Automaticamente via realtime

## Troubleshooting

### Se as trades não estão fechando automaticamente:

1. Verifique se o cron job está ativo:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-expired-trades-every-minute';
```

2. Veja os logs de execução:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

3. Execute manualmente a função para testar:
```sql
SELECT net.http_post(
  url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/process-expired-trades',
  headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
  body:='{}'::jsonb
);
```

### Se precisar remover o cron job:

```sql
SELECT cron.unschedule('process-expired-trades-every-minute');
```

## Links Úteis

- **Edge Function Logs**: https://supabase.com/dashboard/project/xhmisqcngalyjapkdwvh/functions/process-expired-trades/logs
- **SQL Editor**: https://supabase.com/dashboard/project/xhmisqcngalyjapkdwvh/sql/new
- **Documentação Cron**: https://supabase.com/docs/guides/database/extensions/pg_cron
