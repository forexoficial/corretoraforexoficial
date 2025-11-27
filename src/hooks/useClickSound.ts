import { useCallback } from 'react';
import { useSoundEffects } from './useSoundEffects';

/**
 * Hook para adicionar som de clique em qualquer elemento
 * Use onClick={withClickSound(yourHandler)} ou apenas onClick={playClickSound}
 */
export function useClickSound() {
  const { playSound } = useSoundEffects();

  const playClickSound = useCallback(() => {
    playSound('click');
  }, [playSound]);

  const withClickSound = useCallback(
    <T extends (...args: any[]) => any>(handler?: T) => {
      return (...args: Parameters<T>) => {
        playClickSound();
        return handler?.(...args);
      };
    },
    [playClickSound]
  );

  return { playClickSound, withClickSound };
}
