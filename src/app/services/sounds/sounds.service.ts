import { Injectable } from '@angular/core';
import { Howl } from 'howler';

@Injectable({
  providedIn: 'root',
})
export class SoundsService {
  constructor() {}

  constantDrumId?: number;
  currentChord: number = 1;

  chords = new Howl({
    src: 'assets/sounds/soundsprites/chordsSprite.mp3',
    sprite: {
      'Chord 1': [0, 8071.8367346938785],
      'Chord 2': [10000, 8071.8367346938785],
      'Chord 3': [20000, 8071.8367346938785],
      'Chord 4': [30000, 8071.836734693875],
      'Chord 5': [40000, 8071.836734693875],
      'Chord 6': [50000, 8071.836734693875],
      'Chord 7': [60000, 8071.836734693875],
      'Chord 8': [70000, 8071.836734693875],
      'Chord 9': [80000, 8071.836734693875],
    },
  });

  drums = new Howl({
    src: ['assets/sounds/soundsprites/drumsSprite.mp3'],
    sprite: {
      constantDrum: [0, 65567.34693877552, true],
      endingDrum: [67000, 4257.9591836734635],
      inactiveDrum: [73000, 8071.836734693875],
      successDrum: [83000, 574.6938775510273],
    },
  });

  startContantDrum() {
    this.constantDrumId = this.drums.play('constantDrum');
  }

  pauseContantDrum() {
    this.drums.pause(this.constantDrumId);
  }

  endConstantDrum() {
    // this.drums.fade(1.0, 0, 2, this.constantDrumId);
    this.drums.stop(this.constantDrumId);
    this.drums.play('endingDrum');
  }

  isConstantDrumPlaying() {
    return this.drums.playing(this.constantDrumId);
  }

  playNextChord() {
    if (this.currentChord >= 9) {
      this.currentChord = 1;
    }
    console.log(`playing CHORD ${this.currentChord}`);
    this.chords.play(`Chord ${this.currentChord}`);
    this.currentChord += 1;
  }

  fade(from: number, to: number, duration: number, id?: number | undefined) {
    this.drums.fade(from, to, duration, this.constantDrumId);
  }
}