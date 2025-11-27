# Sistema de Timezone UTC-3 (São Paulo) - Abordagem Correta

## Visão Geral

A plataforma exibe todos os horários em UTC-3 (São Paulo) para os usuários. Os timestamps são armazenados em UTC no banco de dados (padrão PostgreSQL) e convertidos para UTC-3 apenas na **exibição**.

## Conceito Fundamental

**UTC-3** significa "3 horas ATRÁS do UTC":
- UTC 15:00 = UTC-3 12:00 (meio-dia em São Paulo)
- UTC 00:00 = UTC-3 21:00 (9 da noite do dia anterior em São Paulo)

## Arquitetura

### 1. Banco de Dados (PostgreSQL)
- **Armazena tudo em UTC** (padrão do PostgreSQL com `TIMESTAMP WITH TIME ZONE`)
- Não fazemos conversão manual no banco
- Os timestamps são automaticamente tratados como UTC pelo Postgres

### 2. Edge Functions
- Geram timestamps usando `new Date()` (UTC por padrão)
- Armazenam no banco sem conversão
- O PostgreSQL cuida do resto

### 3. Frontend - Lightweight Charts
- Recebe timestamps em UTC do banco
- Usa `localization.timeFormatter` para exibir em UTC-3
- A conversão acontece **apenas na exibição** usando `toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })`

## Implementação Detalhada

### TradingViewChart Component

```typescript
// Criar chart com localização brasileira
const chart = createChart(container, {
  // ... outras configs
  localization: {
    locale: 'pt-BR',
    timeFormatter: (timestamp: number) => {
      // Unix timestamp (segundos) → Date → Exibir em UTC-3
      const date = new Date(timestamp * 1000);
      return date.toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    }
  }
});

// Carregar candles do banco (já em UTC)
const chartData = candles.map(c => ({
  time: (new Date(c.timestamp).getTime() / 1000) as Time, // UTC timestamp
  open: Number(c.open),
  high: Number(c.high),
  low: Number(c.low),
  close: Number(c.close),
}));
```

**Por que funciona:**
1. Os timestamps no banco estão em UTC
2. Convertemos para Unix timestamp (segundos desde epoch)
3. O `timeFormatter` converte para UTC-3 na exibição usando `timeZone: 'America/Sao_Paulo'`

### ChartBiasManager Component

```typescript
// Quando o admin insere data/hora
const handleCreate = async () => {
  // datetime-local do navegador → ISO string (considera timezone local)
  const startTimeUTC = new Date(formData.startTime).toISOString();
  const endTimeUTC = new Date(formData.endTime).toISOString();
  
  // Salvar no banco (já em UTC)
  await supabase.from('chart_biases').insert({
    start_time: startTimeUTC,
    end_time: endTimeUTC,
    // ...
  });
};

// Exibir para o admin
<div>Início: {new Date(bias.start_time).toLocaleString('pt-BR', { 
  timeZone: 'America/Sao_Paulo' 
})}</div>
```

**Por que funciona:**
1. Input `datetime-local` captura a hora local do navegador
2. `new Date().toISOString()` converte para UTC automaticamente
3. Na exibição, usamos `toLocaleString` com `timeZone: 'America/Sao_Paulo'`

### Edge Function (generate-candles)

```typescript
// Gerar timestamp atual
const timestamp = new Date(); // Automaticamente em UTC

// Salvar no banco
await supabase.from('candles').insert({
  timestamp: timestamp.toISOString(), // UTC
  // ...
});
```

**Por que funciona:**
- JavaScript `Date` sempre trabalha em UTC internamente
- `toISOString()` sempre retorna UTC
- PostgreSQL armazena como UTC

## Fluxo Completo

```
Admin insere: "25/01/2024 15:00" (navegador em UTC-3)
    ↓
JavaScript converte: "2024-01-25T18:00:00.000Z" (UTC)
    ↓
PostgreSQL armazena: "2024-01-25 18:00:00+00" (UTC)
    ↓
Frontend consulta: "2024-01-25T18:00:00.000Z" (UTC)
    ↓
toLocaleString exibe: "25/01 15:00" (UTC-3)
```

## Regras de Ouro

### ✅ FAÇA:
1. Armazene timestamps em UTC no banco (deixe o PostgreSQL fazer isso)
2. Use `toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })` para exibir
3. Use `new Date(input).toISOString()` para salvar no banco
4. Deixe o JavaScript e PostgreSQL cuidarem das conversões automáticas

### ❌ NÃO FAÇA:
1. Não manipule timestamps manualmente com matemática de horas
2. Não tente "ajustar" timestamps antes de salvar no banco
3. Não converta timestamps no servidor/edge functions
4. Não use funções SQL customizadas para conversão (não é necessário)

## Por Que a Abordagem Anterior Estava Errada

A tentativa anterior de "forçar UTC-3" criava problemas:

```typescript
// ❌ ERRADO - causava deslocamento duplo
const saoPauloTime = utcTime - (3 * 60 * 60 * 1000);
time: (saoPauloTime / 1000) as Time
```

**Problema:** 
- Subtraía 3 horas do timestamp
- O chart interpretava como UTC e aplicava timezone do navegador novamente
- Resultado: candles apareciam 3 horas errados

## Testando

### Teste 1: Verificar Candle no Banco
```sql
SELECT 
  timestamp,
  timestamp AT TIME ZONE 'America/Sao_Paulo' as horario_sp
FROM candles 
ORDER BY timestamp DESC 
LIMIT 1;
```

### Teste 2: Verificar no Frontend
1. Abra o gráfico
2. Passe o mouse sobre um candle
3. Verifique se o horário mostrado corresponde ao horário de São Paulo

### Teste 3: Criar Bias
1. Vá para Admin → Gráficos OTC → Bias
2. Insira "25/01/2024 15:00" (sua hora local)
3. Verifique se aparece corretamente na lista

## Componentes Afetados

✅ **Atualizados e Funcionando:**
- `src/components/TradingViewChart.tsx` - Exibe em UTC-3
- `src/components/admin/charts/ChartBiasManager.tsx` - Input/output em UTC-3
- `supabase/functions/generate-candles/index.ts` - Gera em UTC

✅ **Não Precisam Atualização** (já funcionam):
- `ChartManipulation` - Usa timestamps do banco
- `ActiveTradesMonitor` - Usa timestamps do banco
- Todos os outros componentes que exibem timestamps

## Manutenção Futura

Ao adicionar novos recursos com timestamps:

1. **Entrada do Usuário:**
   ```typescript
   const utcTime = new Date(userInput).toISOString();
   ```

2. **Exibição:**
   ```typescript
   new Date(timestamp).toLocaleString('pt-BR', { 
     timeZone: 'America/Sao_Paulo' 
   })
   ```

3. **Geração de Timestamps:**
   ```typescript
   const now = new Date(); // Sempre em UTC
   ```

---

**Status:** ✅ Implementado Corretamente
**Data:** Janeiro 2024
**Timezone:** UTC-3 (America/Sao_Paulo)
