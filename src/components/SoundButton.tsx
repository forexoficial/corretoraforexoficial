import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useButtonSound } from "@/hooks/useSoundEffects";

/**
 * Button component with automatic click sound effect
 * Use this instead of regular Button when you want click sounds
 */
export const SoundButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, ...props }, ref) => {
    const { playClickSound } = useButtonSound();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playClickSound();
      onClick?.(e);
    };

    return <Button ref={ref} onClick={handleClick} {...props} />;
  }
);

SoundButton.displayName = "SoundButton";
