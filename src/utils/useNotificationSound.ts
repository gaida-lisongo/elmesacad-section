// hooks/useNotificationSound.ts

import { useCallback, useRef } from "react";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);

  const markInteracted = useCallback(() => {
    hasInteractedRef.current = true;
  }, []);

  const playSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/payment.wav");
      audioRef.current.volume = 1;
    }

    if (!hasInteractedRef.current) {
      // Le navigateur bloque la lecture automatique avant interaction utilisateur.
      return;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.error("Impossible de jouer le son :", err);
    });
  }, []);

  return { playSound, markInteracted };
}