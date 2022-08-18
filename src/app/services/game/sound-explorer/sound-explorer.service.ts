import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { GameState, Genre, PreferenceState } from 'src/app/types/pointmotion';
import { CalibrationService } from '../../calibration/calibration.service';
import { CheckinService } from '../../checkin/checkin.service';
import { HandTrackerService } from '../../classifiers/hand-tracker/hand-tracker.service';
import { ElementsService } from '../../elements/elements.service';
import { GameStateService } from '../../game-state/game-state.service';
import { SoundsService } from '../../sounds/sounds.service';
import { TtsService } from '../../tts/tts.service';
import { environment } from 'src/environments/environment';
import { game } from 'src/app/store/actions/game.actions';
import { Origin, Shape, SoundExplorerScene } from 'src/app/scenes/sound-explorer.scene';
import { sampleSize as _sampleSize } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class SoundExplorerService {
  private genre: Genre = 'jazz';
  private globalReCalibrationCount: number;
  private config = {
    gameDuration: environment.settings['sound_explorer'].configuration.gameDuration,
    speed: environment.settings['sound_explorer'].configuration.speed,
  };
  private isGameComplete = false;
  private successfulReps = 0;
  private failedReps = 0;
  private totalReps = 0;
  private shapes: Shape[] = ['circle', 'triangle', 'rectangle'];
  private originsWithAngleRange: { [key in Origin]: number[] } = {
    'bottom-right': [-180, -90],
    'bottom-left': [-90, 0],
    'bottom-center': [-180, 0],
    'left-center': [-90, 90],
    'right-center': [-270, -90],
    'top-left': [0, 90],
    'top-right': [-270, -180],
  };
  private getRandomItemFromArray = <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };
  private getRandomNumberBetweenRange = (...args: number[]) => {
    return Math.floor(Math.random() * (args[1] - args[0] + 1)) + args[0];
  };
  private drawShape = (shape: Shape) => {
    const randomPosition = this.getRandomItemFromArray(
      Object.keys(this.originsWithAngleRange) as Origin[],
    );
    this.soundExplorerScene.showShapes(
      [shape],
      randomPosition,
      this.getRandomNumberBetweenRange(...this.originsWithAngleRange[randomPosition]),
      600,
    );
  };

  constructor(
    private store: Store<{
      game: GameState;
      preference: PreferenceState;
    }>,
    private elements: ElementsService,
    private gameStateService: GameStateService,
    private calibrationService: CalibrationService,
    private checkinService: CheckinService,
    private ttsService: TtsService,
    private handTrackerService: HandTrackerService,
    private soundsService: SoundsService,
    private soundExplorerScene: SoundExplorerScene,
  ) {
    this.handTrackerService.enable();
    this.store
      .select((state) => state.game)
      .subscribe((game) => {
        if (game.id) {
          //Update the game state whenever redux state changes
          const { id, ...gameState } = game;
          this.gameStateService.updateGame(id, gameState);
        }
      });
    this.calibrationService.reCalibrationCount.subscribe((count) => {
      this.globalReCalibrationCount = count;
    });
    this.store
      .select((state) => state.preference)
      .subscribe((preference) => {
        if (preference.genre && this.genre !== preference.genre) {
          this.genre = preference.genre;
          this.soundsService.loadMusicFiles(this.genre);
        } else {
          this.genre === 'jazz' && this.soundsService.loadMusicFiles('jazz');
        }
      });

    this.soundExplorerScene.enable();
    this.soundExplorerScene.enableCollisionDetection();
    this.soundExplorerScene.enableLeftHand();
    this.soundExplorerScene.enableRightHand();
  }

  welcome() {
    return [
      async (reCalibrationCount: number) => {
        this.soundExplorerScene.scene.start('soundSlicer');
        this.ttsService.tts("Raise one of your hands when you're ready to start.");
        this.elements.guide.state = {
          data: {
            title: "Raise your hand when you're ready to start.",
            showIndefinitely: true,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.handTrackerService.waitUntilHandRaised('any-hand');
        this.soundsService.playCalibrationSound('success');
        this.elements.guide.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
      },
    ];
  }

  tutorial() {
    return [
      async (reCalibrationCount: number) => {
        this.soundsService.playActivityInstructionSound(this.genre);
        this.ttsService.tts('Use your hands to interact with the shapes you see on the screen.');
        this.elements.guide.state = {
          data: {
            title: 'Use your hands to interact with the shapes on screen.',
            titleDuration: 5000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(5000);
        const randomPosition = this.getRandomItemFromArray(
          Object.keys(this.originsWithAngleRange) as Origin[],
        );
        this.soundExplorerScene.showShapes(
          [this.getRandomItemFromArray(this.shapes)],
          randomPosition,
          this.getRandomNumberBetweenRange(...this.originsWithAngleRange[randomPosition]),
          500,
        );
        const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
        console.log('rep: ', rep);
        this.ttsService.tts(
          'Did you hear that? You just created musical note by interacting with the shape.',
        );
        this.elements.video.state = {
          data: {
            type: 'gif',
            title: 'Did you hear that?',
            description: 'You just created music by interacting with the shape.',
            src: 'assets/images/beat-boxer/did-you-hear-that.png',
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(5000);
        this.elements.video.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        await this.elements.sleep(1000);
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts("Let's try a few more.");
        this.elements.guide.state = {
          data: {
            title: "Let's try a few more.",
            titleDuration: 2000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(2500);
        let successfulReps = 0;
        const repsToComplete = 3;
        this.elements.score.state = {
          data: {
            label: '',
            value: successfulReps,
            goal: repsToComplete,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        // Todo: 3 reps with single notes
        for (let i = 0; i < 3; i++) {
          this.drawShape(this.getRandomItemFromArray(this.shapes));
          const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
          successfulReps++;
          this.elements.score.state = {
            data: {
              label: '',
              value: successfulReps,
              goal: repsToComplete,
            },
            attributes: {
              visibility: 'visible',
              reCalibrationCount,
            },
          };
          console.log('rep: ', rep);
          await this.elements.sleep(1000);
        }
        await this.elements.sleep(2000);
        this.elements.score.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        this.ttsService.tts('Good job. But single notes are just the beginning.');
        this.elements.guide.state = {
          data: {
            title: 'Good job but single notes are just the beginning.',
            titleDuration: 3000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(3500);
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts("Let's try interacting with more than 1 shape now.");
        this.elements.guide.state = {
          data: {
            title: "Let's try interacting with more than 1 shape now.",
            titleDuration: 3000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(3500);
        for (let i = 0; i < 2; i++) {
          this.drawShape(this.getRandomItemFromArray(this.shapes));
        }
        const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
        console.log('rep: ', rep);
        this.ttsService.tts('When you play multiple notes at the same time you create a harmony.');
        this.elements.video.state = {
          data: {
            type: 'gif',
            title: 'You created harmony!',
            description: 'When multiple notes are played together you create a harmony.',
            src: 'assets/images/beat-boxer/did-you-hear-that.png',
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(5000);
        this.elements.video.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        await this.elements.sleep(1000);
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts("Now let's try interacting with 3 shapes in one motion.");
        this.elements.guide.state = {
          data: {
            title: 'Try interacting with 3 shapes in one motion.',
            titleDuration: 3000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(3500);
        for (let i = 0; i < 3; i++) {
          this.drawShape(this.getRandomItemFromArray(this.shapes));
        }
        const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
        console.log('rep: ', rep);
        this.ttsService.tts(
          'When you interact with 3 or more shapes in one motion, you create a chord.',
        );
        this.elements.video.state = {
          data: {
            type: 'gif',
            title: 'You created a chord!',
            description: 'When 3 or more shapes are interacted with, you create a chord',
            src: 'assets/images/beat-boxer/did-you-hear-that.png',
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(5000);
        this.elements.video.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        await this.elements.sleep(1000);
        this.ttsService.tts('Playing chords will give you extra points.');
        this.elements.guide.state = {
          data: {
            title: 'Playing chords will give you extra points.',
            titleDuration: 3000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(3500);
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts("Let's play a few more chords.");
        this.elements.guide.state = {
          data: {
            title: "Let's play a few chords.",
            titleDuration: 2000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(2500);
        let successfulReps = 0;
        const repsToComplete = 3;
        this.elements.score.state = {
          data: {
            label: '',
            value: successfulReps,
            goal: repsToComplete,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        // Todo: 3 reps with chords
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            this.drawShape(this.getRandomItemFromArray(this.shapes));
          }
          if (i === 2) this.drawShape('wrong');
          const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
          console.log('rep: ', rep);
          successfulReps++;
          this.elements.score.state = {
            data: {
              label: '',
              value: successfulReps,
              goal: repsToComplete,
            },
            attributes: {
              visibility: 'visible',
              reCalibrationCount,
            },
          };
          await this.elements.sleep(1000);
        }
        await this.elements.sleep(2000);
        this.elements.score.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts(
          'If you touch the X shape, you will lose your chord streak. Try to avoid them.',
        );
        this.elements.video.state = {
          data: {
            type: 'gif',
            title: "Avoid the 'X' shape.",
            description:
              "If you interact with an 'X' shape, you have to build up to playing the chords again.",
            src: 'assets/images/beat-boxer/did-you-hear-that.png',
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(5000);
        this.elements.video.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        await this.elements.sleep(1000);
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts("Looks like you're ready to put it all together now.");
        this.elements.guide.state = {
          data: {
            title: "Looks like you're ready to put it all together.",
            titleDuration: 3000,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.elements.sleep(3500);
        this.ttsService.tts("Raise one of your hands when you're ready to start.");
        this.elements.guide.state = {
          data: {
            title: "Raise your hand when you're ready to start.",
            showIndefinitely: true,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.handTrackerService.waitUntilHandRaised('any-hand');
        this.soundsService.playCalibrationSound('success');
        this.elements.guide.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
      },
      async (reCalibrationCount: number) => {
        this.ttsService.tts('Ready?');
        await this.elements.sleep(1500);
        this.elements.ribbon.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            titles: ['3', '2', '1', 'GO!'],
            titleDuration: 1200,
            tts: true,
          },
        };
        await this.elements.sleep(8000);
        // Todo: 30 seconds of tutorial
        let isGameComplete = false;
        const onComplete = () => {
          isGameComplete = true;
        };
        this.elements.timer.state = {
          data: {
            mode: 'start',
            isCountdown: true,
            duration: 30 * 1000,
            onComplete,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        while (!isGameComplete) {
          for (let j = 0; j < this.getRandomNumberBetweenRange(1, 3); j++) {
            this.drawShape(this.getRandomItemFromArray(this.shapes));
          }
          const shouldShowXMark = Math.random() > 0.5;
          if (shouldShowXMark) {
            this.drawShape('wrong');
          }
          const rep = await this.soundExplorerScene.waitForCollisionOrTimeout();
          console.log('rep: ', rep);
          await this.elements.sleep(1000);
        }
        await this.elements.sleep(2000);
        this.elements.timer.state = {
          data: {
            mode: 'stop',
          },
          attributes: {
            visibility: 'hidden',
            reCalibrationCount,
          },
        };

        this.ttsService.tts("Your time's up");
        this.elements.ribbon.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            titles: ['TIMES UP!'],
          },
        };
        await this.elements.sleep(3500);
        this.ttsService.tts('The guide is complete.');
        this.elements.ribbon.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            titles: ['GUIDE COMPLETED'],
            titleDuration: 2000,
          },
        };
        await this.checkinService.updateOnboardingStatus({
          sound_explorer: true,
        });
        await this.elements.sleep(3000);
        this.soundsService.pauseActivityInstructionSound(this.genre);
      },
    ];
  }

  preLoop() {
    return [
      async (reCalibrationCount: number) => {
        this.ttsService.tts('Last activity. Sound Explorer.');
        this.elements.banner.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            type: 'intro',
            htmlStr: `
            <div class="w-full h-full d-flex flex-column justify-content-center align-items-center">
              <h1 class="pt-2">Last Activity</h2>
              <h1 class="pt-6 display-4">Sound Explorer</h1>
              <h1 class="pt-8" style="font-weight: 200">Area of Focus</h2>
              <h1 class="py-2">Range of Motion and Balance</h2>
            </div>
            `,
            buttons: [
              {
                title: 'Starting Sound Explorer',
                progressDurationMs: 5000,
              },
            ],
          },
        };
        await this.elements.sleep(7000);
        this.ttsService.tts("Raise one of your hands when you're ready to start.");
        this.elements.guide.state = {
          data: {
            title: "Raise your hand when you're ready to start.",
            showIndefinitely: true,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        await this.handTrackerService.waitUntilHandRaised('any-hand');
        this.soundsService.playCalibrationSound('success');
        this.elements.guide.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
      },
    ];
  }

  loop() {
    return [
      // Indicates user the start of the game.
      async (reCalibrationCount: number) => {
        this.ttsService.tts('Ready?');
        await this.elements.sleep(1500);

        this.elements.ribbon.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            titles: ['3', '2', '1', 'GO!'],
            titleDuration: 1200,
            tts: true,
          },
        };
        await this.elements.sleep(8000);
      },

      // Initializes score & timer.
      // When the timer runs out, loop() is ended.
      async (reCalibrationCount: number) => {
        this.elements.score.state = {
          data: {
            label: 'Score',
            value: this.successfulReps,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
        const updateElapsedTime = (elapsedTime: number) => {
          if (elapsedTime >= this.config.gameDuration!) this.isGameComplete = true;
          this.store.dispatch(game.setTotalElapsedTime({ totalDuration: elapsedTime }));
        };
        this.elements.timer.state = {
          data: {
            mode: 'start',
            isCountdown: true,
            duration: this.config.gameDuration! * 1000,
            onPause: updateElapsedTime,
            onComplete: updateElapsedTime,
          },
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
        };
      },

      // The actual meat. This function keeps runnning until the timer runs out.
      async (reCalibrationCount: number) => {
        while (!this.isGameComplete) {
          const randomSampleSize = Math.floor(Math.random() * this.shapes.length);
          const randomShapes = _sampleSize(this.shapes, randomSampleSize);

          let scoreMultiplier = 1;
          if (randomShapes.length >= 3) {
            // we double the score if there are more than 2 shapes.
            scoreMultiplier = 2;
          }

          const randomPosition = this.getRandomItemFromArray(
            Object.keys(this.originsWithAngleRange) as Origin[],
          );

          // flip a coin...
          const showObstacle = Math.random() > 0.5;
          this.soundExplorerScene.showShapes(
            showObstacle ? ['wrong'] : randomShapes,
            randomPosition,
            this.getRandomNumberBetweenRange(...this.originsWithAngleRange[randomPosition]),
            500,
          );
          await this.soundExplorerScene.waitForCollisionOrTimeout();
          // multiply the score with multiplier.
          // if success, calculate the score. (probably Phaser APIs should do it?)
        }
      },

      // this probably should be in postLoop() ?
      async (reCalibrationCount: number) => {
        await this.elements.sleep(5000);
        this.elements.score.attributes = {
          visibility: 'hidden',
          reCalibrationCount,
        };
        this.elements.timer.state = {
          data: {
            mode: 'stop',
          },
          attributes: {
            visibility: 'hidden',
            reCalibrationCount,
          },
        };

        this.ttsService.tts("Your time's up");
        this.elements.ribbon.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            titles: ['TIMES UP!'],
          },
        };
        await this.elements.sleep(5000);
      },
    ];
  }

  postLoop() {
    return [
      async (reCalibrationCount: number) => {
        this.store.dispatch(game.gameCompleted());
        this.gameStateService.postLoopHook();
        this.soundsService.stopGenreSound();
        this.ttsService.tts(
          `Your score is ${this.successfulReps}, time completed ${this.config
            .gameDuration!} seconds.`,
        );
        const highScore = await this.checkinService.getHighScore('sound_explorer');
        let totalDuration: {
          minutes: string;
          seconds: string;
        };
        // eslint-disable-next-line prefer-const
        totalDuration = this.checkinService.getDurationForTimer(this.config.gameDuration!);
        this.elements.banner.state = {
          attributes: {
            visibility: 'visible',
            reCalibrationCount,
          },
          data: {
            type: 'outro',
            htmlStr: `
          <div class="pl-10 text-start px-14" style="padding-left: 20px;">
            <h1 class="pt-8 display-3">Sound Explorer</h1>
            <h2 class="pt-7">Score: ${this.successfulReps}</h2>
            <h2 class="pt-5">High Score: ${Math.max(
              highScore && highScore.length ? highScore[0].repsCompleted : 0,
              this.successfulReps,
            )}</h2>
            <h2 class="pt-5">Time Completed: ${totalDuration.minutes}:${
              totalDuration.seconds
            } minutes</h2>
          <div>
          `,
            buttons: [
              {
                title: 'Back to Homepage',
                progressDurationMs: 10000,
              },
            ],
          },
        };

        await this.elements.sleep(12000);
      },
    ];
  }
}
