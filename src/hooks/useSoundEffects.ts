import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'trade-open' | 'trade-win' | 'trade-loss' | 'click';

// Global state for audio unlock
let audioUnlocked = false;
let audioContext: AudioContext | null = null;
let unlockAttempts = 0;
const MAX_UNLOCK_ATTEMPTS = 5;

// Pre-loaded audio buffers for better PWA performance
const audioBuffers: Map<string, AudioBuffer> = new Map();
const audioElements: Map<SoundType, HTMLAudioElement> = new Map();

// Check if running as installed PWA
function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

// Initialize AudioContext
function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    } catch (e) {
      console.warn('[Sound] Erro ao criar AudioContext:', e);
    }
  }
  return audioContext;
}

// Load audio file as buffer for Web Audio API (better for PWA)
async function loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
  const ctx = getAudioContext();
  if (!ctx) return null;
  
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (e) {
    console.warn('[Sound] Erro ao carregar buffer:', url, e);
    return null;
  }
}

// Preload all audio buffers
async function preloadAudioBuffers() {
  const soundFiles = {
    'trade-open': '/sounds/alert.MP3',
    'trade-win': '/sounds/win.MP3',
    'trade-loss': '/sounds/loss.MP3',
    'click': '/sounds/volatility.MP3',
  };

  for (const [key, url] of Object.entries(soundFiles)) {
    if (!audioBuffers.has(url)) {
      const buffer = await loadAudioBuffer(url);
      if (buffer) {
        audioBuffers.set(url, buffer);
        console.log(`[Sound] Buffer carregado: ${key}`);
      }
    }
  }
}

// Play sound using Web Audio API (better for PWA)
async function playWithWebAudio(url: string, volume: number): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    // Resume if suspended
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    let buffer = audioBuffers.get(url);
    if (!buffer) {
      buffer = await loadAudioBuffer(url);
      if (buffer) {
        audioBuffers.set(url, buffer);
      }
    }

    if (!buffer) return false;

    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(0);
    
    return true;
  } catch (e) {
    console.warn('[Sound] Erro no Web Audio API:', e);
    return false;
  }
}

// Unlock audio for iOS/mobile PWA
async function unlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;
  
  unlockAttempts++;
  console.log(`[Sound] Tentativa de desbloqueio #${unlockAttempts}`);
  
  if (unlockAttempts > MAX_UNLOCK_ATTEMPTS) {
    console.warn('[Sound] Máximo de tentativas de desbloqueio atingido');
    return false;
  }
  
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;
    
    // Resume AudioContext
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play silent sound to unlock
    const silentBuffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(ctx.destination);
    source.start(0);
    
    // For iOS, also create and play a dummy audio element
    const dummyAudio = new Audio();
    dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    dummyAudio.volume = 0.01;
    (dummyAudio as any).playsInline = true;
    (dummyAudio as any).webkitPlaysInline = true;
    
    try {
      await dummyAudio.play();
      dummyAudio.pause();
      dummyAudio.remove();
    } catch (e) {
      // Ignore
    }
    
    // Preload audio buffers after unlock
    await preloadAudioBuffers();
    
    audioUnlocked = true;
    console.log('[Sound] Áudio desbloqueado para PWA mobile');
    return true;
  } catch (error) {
    console.warn('[Sound] Erro ao desbloquear áudio:', error);
    return false;
  }
}

// Setup global unlock listeners
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'];
  
  const handleInteraction = async () => {
    const success = await unlockAudio();
    if (success) {
      unlockEvents.forEach(event => {
        document.removeEventListener(event, handleInteraction, { capture: true });
      });
    }
  };
  
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleInteraction, { capture: true, passive: true });
  });
  
  // Also try to unlock on visibility change (when user returns to app)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !audioUnlocked) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          // Ignore
        }
      }
    }
  });
}

const SOUND_FILES: Record<SoundType, { url: string; volume: number }> = {
  'trade-open': { url: '/sounds/alert.MP3', volume: 0.5 },
  'trade-win': { url: '/sounds/win.MP3', volume: 0.6 },
  'trade-loss': { url: '/sounds/loss.MP3', volume: 0.6 },
  'click': { url: '/sounds/volatility.MP3', volume: 0.2 },
};

export function useSoundEffects() {
  const lastPlayTimeRef = useRef<Record<SoundType, number>>({
    'trade-open': 0,
    'trade-win': 0,
    'trade-loss': 0,
    'click': 0,
  });
  
  // Initialize audio elements as fallback
  useEffect(() => {
    Object.entries(SOUND_FILES).forEach(([key, { url, volume }]) => {
      if (!audioElements.has(key as SoundType)) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = volume;
        (audio as any).playsInline = true;
        (audio as any).webkitPlaysInline = true;
        audio.load();
        audioElements.set(key as SoundType, audio);
      }
    });
    
    console.log('[Sound] Efeitos sonoros inicializados');
    
    // Try to preload buffers
    if (audioUnlocked) {
      preloadAudioBuffers();
    }
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    const config = SOUND_FILES[type];
    if (!config) return;

    // Debounce
    const now = Date.now();
    const minInterval = type === 'click' ? 50 : 500;
    if (now - lastPlayTimeRef.current[type] < minInterval) {
      return;
    }
    lastPlayTimeRef.current[type] = now;
    
    // Ensure unlocked
    if (!audioUnlocked) {
      await unlockAudio();
    }
    
    // Try Web Audio API first (better for PWA)
    const isPWA = isInstalledPWA();
    if (isPWA || audioUnlocked) {
      const webAudioSuccess = await playWithWebAudio(config.url, config.volume);
      if (webAudioSuccess) {
        return;
      }
    }
    
    // Fallback to HTML Audio element
    const audio = audioElements.get(type);
    if (audio) {
      try {
        audio.currentTime = 0;
        await audio.play();
      } catch (error) {
        console.warn(`[Sound] Erro ao reproduzir ${type}:`, (error as Error).message);
        
        // Try to unlock and retry
        audioUnlocked = false;
        const unlocked = await unlockAudio();
        if (unlocked) {
          try {
            audio.currentTime = 0;
            await audio.play();
          } catch (retryError) {
            console.warn(`[Sound] Retry falhou para ${type}`);
          }
        }
      }
    }
  }, []);

  return { playSound };
}

// Global sound effect hook for buttons
export function useButtonSound() {
  const { playSound } = useSoundEffects();
  
  const playClickSound = useCallback(() => {
    playSound('click');
  }, [playSound]);

  return { playClickSound };
}
