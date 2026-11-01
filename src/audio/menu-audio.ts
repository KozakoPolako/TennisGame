export class MenuAudio {
  private context: AudioContext | undefined;
  enabled = false;

  async playStart(): Promise<void> {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      await this.context.resume();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(660, now + 0.07);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.17);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch {
      this.enabled = false;
    }
  }

  dispose(): void {
    void this.context?.close();
  }
}