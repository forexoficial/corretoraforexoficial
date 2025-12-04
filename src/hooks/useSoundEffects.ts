import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'trade-open' | 'trade-win' | 'trade-loss' | 'click';

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
    soundsRef.current = {
      'trade-open': new Audio('/sounds/alert.MP3'),
      'trade-win': new Audio('/sounds/win.MP3'),
      'trade-loss': new Audio('/sounds/loss.MP3'),
      'click': new Audio('/sounds/volatility.MP3'),
    };

    // Set volumes
    if (soundsRef.current['trade-open']) soundsRef.current['trade-open'].volume = 0.5;
    if (soundsRef.current['trade-win']) soundsRef.current['trade-win'].volume = 0.6;
    if (soundsRef.current['trade-loss']) soundsRef.current['trade-loss'].volume = 0.6;
    if (soundsRef.current['click']) soundsRef.current['click'].volume = 0.2;
    
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
    
    // Reset and play
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.warn(`[Sound] Erro ao reproduzir ${type}:`, error.message);
    });
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
