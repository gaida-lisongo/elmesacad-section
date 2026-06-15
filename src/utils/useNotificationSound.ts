// hooks/useNotificationSound.ts
import { useCallback, useEffect, useRef } from "react";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Instanciation de l'audio uniquement côté client
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/payment.wav");
      audioRef.current.volume = 1.0;
    }
  }, []);

  // Déblocage global de l'audio dès le premier clic sur l'application
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        // Jouer un silence très court pour dire au navigateur : "C'est bon, on a interagi"
        audioRef.current.play()
          .then(() => {
            // Revenir au début pour la vraie notification
            if (audioRef.current) audioRef.current.currentTime = 0;
            // Supprimer l'écouteur global puisqu'il est débloqué
            document.removeEventListener("click", unlockAudio);
          })
          .catch(() => {
            // Échec silencieux si le navigateur refuse quand même
          });
      }
    };

    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);

  const playSound = useCallback(() => {
    if (!audioRef.current) return;

    // On rembobine et on joue de manière sécurisée
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.warn("Lecture audio bloquée par le navigateur (Attente d'un clic) :", err);
    });
  }, []);

  // On garde 'markInteracted' vide pour ne pas casser ton composant principal,
  // mais il n'est plus nécessaire !
  const markInteracted = useCallback(() => {}, []);

  return { playSound, markInteracted };
}