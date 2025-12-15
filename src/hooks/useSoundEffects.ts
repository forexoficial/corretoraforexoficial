import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'trade-open' | 'trade-win' | 'trade-loss' | 'click';

// Global flag to track if audio has been unlocked by user interaction
let audioUnlocked = false;
let audioContext: AudioContext | null = null;
let unlockAttempts = 0;

// Function to unlock audio on iOS/mobile PWA - must be called from user gesture
async function unlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;
  
  unlockAttempts++;
  console.log(`[Sound] Tentativa de desbloqueio #${unlockAttempts}`);
  
  try {
    // Create AudioContext if not exists
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[Sound] AudioContext não suportado');
        return false;
      }
      audioContext = new AudioContextClass();
    }
    
    // Resume if suspended (required for iOS PWA)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('[Sound] AudioContext resumido');
    }
    
    // Play a silent sound to fully unlock audio on iOS PWA
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    // Also try to play and immediately pause a dummy audio element
    // This helps with some PWA implementations
    const dummyAudio = new Audio();
    dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    dummyAudio.volume = 0.01;
    try {
      await dummyAudio.play();
      dummyAudio.pause();
    } catch (e) {
      // Ignore errors from dummy audio
    }
    
    audioUnlocked = true;
    console.log('[Sound] Áudio desbloqueado para PWA mobile');
    return true;
  } catch (error) {
    console.warn('[Sound] Erro ao desbloquear áudio:', error);
    return false;
  }
}

// Attach unlock to user interactions - keep trying until successful
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'];
  
  const handleInteraction = async () => {
    const success = await unlockAudio();
    if (success) {
      // Only remove listeners after successful unlock
      unlockEvents.forEach(event => {
        document.removeEventListener(event, handleInteraction, true);
      });
    }
  };
  
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleInteraction, true);
  });
}

export function useSoundEffects() {
  const soundsRef = useRef<Record<SoundType, HTMLAudioElement | null>>({
    'trade-open': null,
    'trade-win': null,
    'trade-loss': null,
    'click': null,
  });
  
  // Track last play time to prevent rapid duplicate plays
  const lastPlayTimeRef = useRef<Record<SoundType, number>>({
    'trade-open': 0,
    'trade-win': 0,
    'trade-loss': 0,
    'click': 0,
  });

  useEffect(() => {
    // Initialize all audio objects with correct file extensions
    const sounds: Record<SoundType, HTMLAudioElement> = {
      'trade-open': new Audio('/sounds/alert.MP3'),
      'trade-win': new Audio('/sounds/win.MP3'),
      'trade-loss': new Audio('/sounds/loss.MP3'),
      'click': new Audio('/sounds/volatility.MP3'),
    };
    
    // Configure each audio element for mobile compatibility
    Object.entries(sounds).forEach(([key, audio]) => {
      audio.preload = 'auto';
      // Load the audio file
      audio.load();
    });

    // Set volumes
    sounds['trade-open'].volume = 0.5;
    sounds['trade-win'].volume = 0.6;
    sounds['trade-loss'].volume = 0.6;
    sounds['click'].volume = 0.2;
    
    soundsRef.current = sounds;
    
    console.log('[Sound] Efeitos sonoros inicializados');

    return () => {
      // Cleanup
      Object.values(soundsRef.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  const playSound = useCallback(async (type: SoundType) => {
    const audio = soundsRef.current[type];
    if (!audio) {
      console.warn(`[Sound] Audio não encontrado para tipo: ${type}`);
      return;
    }

    // Prevent duplicate plays within 500ms (except for click sounds)
    const now = Date.now();
    const minInterval = type === 'click' ? 50 : 500;
    if (now - lastPlayTimeRef.current[type] < minInterval) {
      return;
    }
    
    lastPlayTimeRef.current[type] = now;
    
    // Ensure audio is unlocked before playing (especially for PWA)
    if (!audioUnlocked) {
      await unlockAudio();
    }
    
    // Play the sound with multiple fallback strategies for PWA
    try {
      // Reset audio position
      audio.currentTime = 0;
      
      // Try to resume AudioContext if it got suspended
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(async (error) => {
          console.warn(`[Sound] Erro ao reproduzir ${type}:`, error.message);
          
          // If play failed, try to unlock again and retry once
          if (!audioUnlocked || error.name === 'NotAllowedError') {
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
        });
      }
    } catch (error) {
      console.warn(`[Sound] Exceção ao reproduzir ${type}:`, error);
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
