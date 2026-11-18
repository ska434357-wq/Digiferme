// Speech Synthesis utility designed for accessibility in low-literacy agricultural settings
// Works 100% offline in modern WebKit / Chromium mobile browsers

export function speakMessage(text: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this device.');
    return false;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.95; // Slightly slower, more articulate for clarity
  utterance.pitch = 1.0;

  // Attempt to select a French voice if available
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find((v) => v.lang.startsWith('fr'));
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}
