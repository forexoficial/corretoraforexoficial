import { useRef, useCallback, useEffect } from 'react';

type SoundType = 'trade-open' | 'trade-win' | 'trade-loss' | 'click';

export function useSoundEffects() {
  const soundsRef = useRef<Record<SoundType, HTMLAudioElement | null>>({
    'trade-open': null,
    'trade-win': null,
    'trade-loss': null,
    'click': null,
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
    if (audio) {
      // Reset audio to start if already playing
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.warn(`[Sound] Erro ao reproduzir ${type}:`, error.message);
      });
    } else {
      console.warn(`[Sound] Audio não encontrado para tipo: ${type}`);
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
