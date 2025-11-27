/**
 * Rate Limiter Middleware para Edge Functions
 * Previne abuso de API com controle de taxa por IP/User
 */

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requests na janela
}

// Armazenamento em memória (resetado a cada deploy)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Limpa entradas expiradas para evitar memory leak
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}

/**
 * Verifica rate limit para um identificador
 * @param identifier - IP, user_id, ou outro identificador único
 * @param config - Configuração do rate limit
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  
  // Cleanup periódico (a cada 100 checks)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    // Nova janela ou janela expirada
    const resetTime = now + config.windowMs;
    requestCounts.set(identifier, { count: 1, resetTime });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }

  // Janela ativa
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter
    };
  }

  // Incrementar contador
  record.count++;
  requestCounts.set(identifier, record);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Middleware de rate limiting para Edge Functions
 */
export function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig
): Response | null {
  // Extrair identificador (IP ou user do auth header)
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('cf-connecting-ip') || 
             'unknown';
  
  const authHeader = req.headers.get('authorization');
  let identifier = ip;
  
  // Se tiver JWT, usar user_id como identificador (mais preciso)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const payload = JSON.parse(atob(token.split('.')[1]));
      identifier = payload.sub || ip;
    } catch {
      // Falhou ao decodificar JWT, usa IP
    }
  }

  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    console.warn(`[Rate Limit] Blocked request from ${identifier}`);
    
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': result.retryAfter!.toString()
        }
      }
    );
  }

  // Request permitido - adicionar headers informativos
  return null; // Sem erro, pode continuar
}

/**
 * Headers de rate limit para adicionar à resposta de sucesso
 */
export function getRateLimitHeaders(
  identifier: string,
  config: RateLimitConfig
): Record<string, string> {
  const record = requestCounts.get(identifier);
  
  if (!record) {
    return {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': config.maxRequests.toString()
    };
  }

  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxRequests - record.count).toString(),
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
  };
}
