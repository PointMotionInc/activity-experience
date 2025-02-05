import { Injectable } from '@angular/core';
import { Pose, Results } from '@mediapipe/pose';
import { Subject, take } from 'rxjs';
import { IsModelReady, Options } from 'src/app/types/pointmotion';
@Injectable({
  providedIn: 'root',
})
export class PoseService {
  private options: Options = {
    modelComplexity: 2,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    useCpuInference: false,
  };
  private interval: any;
  private videoElm?: HTMLVideoElement;
  private numOfResults = 0;
  private pose: Pose;
  private config: 'cdn' | 'local';
  private results = new Subject<Results>();
  private isReady = new Subject<IsModelReady>();

  constructor() {}

  /**
   *  will start poseModel that takes in the video feed from a video element and provides pose esults.
   * @param videoElm Video element to take image from
   * @param fps framerate of the device/ framerate at which the game is running.
   * @param config `local` | `cdn`  mediapipe/pose source
   */
  async start(videoElm: HTMLVideoElement, fps = 35, config: 'cdn' | 'local' = 'local') {
    try {
      this.isReady.next({
        isModelReady: false,
        downloadSource: config,
      });
      this.config = config;
      let baseUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/';
      if (config === 'local') {
        baseUrl = '/assets/@mediapipe/pose/';
      }
      this.pose = new Pose({
        locateFile: (file) => {
          console.log('loading holistic file:', file);
          // stick to v0.5 as to avoid breaking changes.
          return baseUrl + file;
        },
      });

      this.pose.setOptions(this.options);

      this.pose.onResults((results) => {
        this.handleResults(results);
      });

      this.videoElm = videoElm;

      // We need to wait until Holistic is done loading the files, only then we set the interval.
      await this.pose?.send({ image: this.videoElm });

      // do something
      console.log('holistic files must be loaded by now');

      // emit an event when mediapipe is ready.
      this.isReady.next({
        isModelReady: true,
        downloadSource: config,
      });

      // This implementation may be faulty!
      // Shoudn't we read frames every (displayFPSRate * 1000) milliseconds?
      this.interval = setInterval(() => {
        if (this.videoElm) {
          this.pose?.send({ image: this.videoElm });
        }
      }, 30);
    } finally {
      this.checkForFailure();
    }
  }

  stop() {
    clearInterval(this.interval);
  }

  getStatus() {
    return this.isReady;
  }

  getPose() {
    return this.results;
  }

  private checkForFailure() {
    setTimeout(() => {
      if (this.numOfResults < 15) {
        // Sometimes a few frames are received before it fails
        this.stop(); // stop sending the frames.

        if (this.config == 'cdn') {
          // Cloud didn't work, local didn't work...
          // let the user know now...
          this.results.error({
            status: 'error',
          });
          this.isReady.error({
            status: 'Something went wrong.',
          });
        } else {
          this.start(this.videoElm as HTMLVideoElement, 25, 'cdn');
        }
      }
    }, 15000);
  }

  private handleResults(results: Results) {
    if (results) {
      this.numOfResults += 1;
      this.results.next(results);
    }
  }

  async getHeightRatio(): Promise<number> {
    const windowHeight = window.innerHeight;
    const playerHeight = await this.getHeightFromPose();

    return playerHeight / windowHeight;
  }

  private getHeightFromPose(): Promise<number> {
    return new Promise((resolve) => {
      this.results.pipe(take(1)).subscribe((results) => {
        const eye = {
          x: window.innerWidth * results.poseLandmarks[1].x,
          y: window.innerHeight * results.poseLandmarks[1].y,
        };
        const leg = {
          x: window.innerWidth * results.poseLandmarks[27].x,
          y: window.innerHeight * results.poseLandmarks[27].y,
        };

        const playerHeight: number = Math.sqrt(
          Math.pow(leg.x - eye.x, 2) + Math.pow(leg.y - eye.y, 2),
        );

        resolve(playerHeight);
      });
    });
  }
}
