import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'trade-open' | 'trade-win' | 'trade-loss' | 'click';

// Global flag to track if audio has been unlocked by user interaction
let audioUnlocked = false;
let audioContext: AudioContext | null = null;

// Function to unlock audio on iOS/mobile PWA - must be called from user gesture
function unlockAudio() {
  if (audioUnlocked) return;
  
  try {
    // Create and resume AudioContext (required for iOS)
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Play a silent sound to unlock audio on iOS
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    audioUnlocked = true;
    console.log('[Sound] Áudio desbloqueado para PWA mobile');
  } catch (error) {
    console.warn('[Sound] Erro ao desbloquear áudio:', error);
  }
}

// Attach unlock to first user interaction
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
  
  const handleFirstInteraction = () => {
    unlockAudio();
    // Remove listeners after first interaction
    unlockEvents.forEach(event => {
      document.removeEventListener(event, handleFirstInteraction, true);
    });
  };
  
  unlockEvents.forEach(event => {
    document.addEventListener(event, handleFirstInteraction, true);
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

  const playSound = useCallback((type: SoundType) => {
    const audio = soundsRef.current[type];
    if (!audio) {
      console.warn(`[Sound] Audio não encontrado para tipo: ${type}`);
      return;
    }

    // Prevent duplicate plays within 500ms (except for click sounds)
    const now = Date.now();
    const minInterval = type === 'click' ? 50 : 500;
    if (now - lastPlayTimeRef.current[type] < minInterval) {
      console.log(`[Sound] Som ${type} ignorado - tocado há menos de ${minInterval}ms`);
      return;
    }
    
    lastPlayTimeRef.current[type] = now;
    
    // Ensure audio is unlocked before playing
    if (!audioUnlocked) {
      unlockAudio();
    }
    
    // Clone the audio for overlapping sounds support and better mobile compatibility
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`[Sound] Erro ao reproduzir ${type}:`, error.message);
          // Try to unlock and play again on next interaction
          audioUnlocked = false;
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
