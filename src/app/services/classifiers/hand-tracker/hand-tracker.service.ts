import { Injectable } from '@angular/core';
import { NormalizedLandmark, NormalizedLandmarkList, Results } from '@mediapipe/pose';
import { BehaviorSubject, debounceTime, Subject, Subscription } from 'rxjs';
import { Coordinate, HandTrackerStatus, OpenHandStatus } from 'src/app/types/pointmotion';
import { Results as HandResults } from '@mediapipe/hands';
import { HandsService } from '../../hands/hands.service';
import { PoseModelAdapter } from '../../pose-model-adapter/pose-model-adapter.service';

@Injectable({
  providedIn: 'root',
})
export class HandTrackerService {
  isEnabled = false;
  visibilityThreshold = 0.7;
  distanceThreshold = 0.2;
  poseSubscription: Subscription;
  handSubscription: Subscription;
  result = new Subject<HandTrackerStatus>();
  status: HandTrackerStatus = undefined;
  debouncedStatus: HandTrackerStatus = undefined;
  // setting default to both-hands as the hand model is disabled. status has to be undefined by default.
  openHandStatus = new BehaviorSubject<OpenHandStatus>('both-hands');

  constructor(private handsService: HandsService, private poseModelAdapter: PoseModelAdapter) {
    this.result.pipe(debounceTime(500)).subscribe((status: HandTrackerStatus) => {
      this.debouncedStatus = status;
      console.log('HandTrackerService:debouncedStatus:', this.status);
    });
  }

  enable() {
    this.isEnabled = true;
    // this.handSubscription = this.handsService.getHands().subscribe((results) => {
    //   const newStatus = this.checkIfHandsAreOpen(results);
    //   this.openHandStatus.next(newStatus);
    //   console.log('Check If Hands Are Open::', newStatus);
    // });
    this.poseSubscription = this.poseModelAdapter.getPose().subscribe((results) => {
      const newStatus = this.classify(results);
      if (!newStatus) return;
      if (newStatus.status != this.status) {
        this.result.next(newStatus.status);
      }
      this.status = newStatus.status;
    });
  }

  disable() {
    this.isEnabled = false;
    if (this.poseSubscription) {
      this.poseSubscription.unsubscribe();
    }
    this.handSubscription && this.handSubscription.unsubscribe();
  }

  async waitUntilHandRaised(hand: HandTrackerStatus) {
    return new Promise((resolve, _) => {
      if (hand === 'any-hand') {
        const resultSubscription = this.result.subscribe((status: HandTrackerStatus) => {
          if (status !== undefined && ['left-hand', 'right-hand', 'both-hands'].includes(status)) {
            resultSubscription.unsubscribe();
            resolve({});
          }
        });
      } else {
        const resultSubscription = this.result.subscribe((status: HandTrackerStatus) => {
          if (status !== undefined && status === hand) {
            resultSubscription.unsubscribe();
            resolve({});
          }
        });
      }
    });
  }

  replayOrTimeout(timeout = 10000): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      this.waitUntilHandRaised('both-hands').then(() => resolve(true), reject);
      setTimeout(() => resolve(false), timeout);
    });
  }

  classify(pose: Results): { status: HandTrackerStatus } {
    if (!this.isEnabled || !pose || !pose.poseLandmarks) {
      return { status: undefined };
    }

    const poseLandmarkArray = pose.poseLandmarks;
    const nose = poseLandmarkArray[0];
    const rightWrist = poseLandmarkArray[16];
    const rightElbow = poseLandmarkArray[14];
    const rightShoulder = poseLandmarkArray[12];
    const leftWrist = poseLandmarkArray[15];
    const leftElbow = poseLandmarkArray[13];
    const leftShoulder = poseLandmarkArray[11];

    // First, considers nose - elbow. As, the elbow is more likely to be always visible.
    if (this._isElbowsVisible(poseLandmarkArray) && this._isWristsVisible(poseLandmarkArray)) {
      const status = this._shoulderWristElbowYDist(
        leftShoulder,
        rightShoulder,
        leftElbow,
        rightElbow,
        leftWrist,
        rightWrist,
      );
      console.log('hand-tracker::status::', status);
      if (status) {
        return { status };
      }
    }

    return { status: undefined };
  }

  _isWristsVisible(poseLandmarkArray: NormalizedLandmarkList): boolean {
    const nose = poseLandmarkArray[0];
    const rightWrist = poseLandmarkArray[16];
    const leftWrist = poseLandmarkArray[15];
    if (
      (nose && nose.visibility && nose.visibility < this.visibilityThreshold) ||
      (rightWrist && rightWrist.visibility && rightWrist.visibility < this.visibilityThreshold) ||
      (leftWrist && leftWrist.visibility && leftWrist.visibility < this.visibilityThreshold)
    ) {
      return false;
    }
    return true;
  }

  _isElbowsVisible(poseLandmarkArray: NormalizedLandmarkList): boolean {
    const nose = poseLandmarkArray[0];
    const rightElbow = poseLandmarkArray[14];
    const leftElbow = poseLandmarkArray[13];
    if (
      (nose && nose.visibility && nose.visibility < this.visibilityThreshold) ||
      (rightElbow && rightElbow.visibility && rightElbow.visibility < this.visibilityThreshold) ||
      (rightElbow && leftElbow.visibility && leftElbow.visibility < this.visibilityThreshold)
    ) {
      return false;
    }
    return true;
  }

  _shoulderWristElbowYDist(
    leftShoulder: NormalizedLandmark,
    rightShoulder: NormalizedLandmark,
    leftElbow: NormalizedLandmark,
    rightElbow: NormalizedLandmark,
    leftWrist: NormalizedLandmark,
    rightWrist: NormalizedLandmark,
  ): HandTrackerStatus {
    const yLeftShoulderElbowDiff = parseFloat((leftShoulder.y - leftElbow.y).toFixed(1));
    const yRightShoulderElbowDiff = parseFloat((rightShoulder.y - rightElbow.y).toFixed(1));
    const yLeftShoulderWristDiff = parseFloat((leftShoulder.y - leftWrist.y).toFixed(1));
    const yRightShoulderWristDiff = parseFloat((rightShoulder.y - rightWrist.y).toFixed(1));

    if (
      yLeftShoulderElbowDiff >= 0 &&
      yRightShoulderElbowDiff >= 0 &&
      yLeftShoulderWristDiff >= 0 &&
      yRightShoulderWristDiff >= 0
    ) {
      return 'both-hands';
    }

    if (yLeftShoulderWristDiff >= 0) {
      return 'left-hand';
    }

    if (yRightShoulderWristDiff >= 0) {
      return 'right-hand';
    }
    return undefined;
  }

  private getAngle(a: Coordinate, b: Coordinate, c: Coordinate) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    const angle = (radians * 180) / Math.PI;
    if (angle > 180) {
      return 360 - angle;
    }
    return Math.abs(angle);
  }

  private midPoint(x1: number, y1: number, x2: number, y2: number): Coordinate {
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
    };
  }

  // the values 160 and 20 have to be finetuned by trail/error.
  private checkIfFingerIsOpen(a: Coordinate, b: Coordinate, c: Coordinate) {
    return this.getAngle(a, b, c) > 160;
  }

  private checkIfFingersAreWide(a: Coordinate, b: Coordinate, c: Coordinate) {
    return this.getAngle(a, b, c) > 20;
  }

  private checkIfHandsAreOpen(results: HandResults): OpenHandStatus {
    const status: { [key: string]: boolean } = {};

    if (results.multiHandLandmarks) {
      const fingers: { [key: string]: [number, number, number] } = {
        thumb: [2, 3, 4],
        index: [5, 6, 7],
        middle: [9, 10, 11],
        ring: [13, 14, 15],
        pinky: [17, 18, 19],
      };

      for (const [idx, landmarks] of results.multiHandLandmarks.entries()) {
        const hand = results.multiHandedness[idx].label.toLowerCase();
        // console.log('hand::', hand);

        let isHandOpen = true;

        for (const finger in fingers) {
          const [a, b, c] = fingers[finger];
          const isFingerOpen = this.checkIfFingerIsOpen(landmarks[a], landmarks[b], landmarks[c]);
          // console.log(`${finger} finger`, isFingerOpen);
          if (isFingerOpen === false) {
            isHandOpen = false;
            break;
          }
        }

        // if hand is not open.. there's no need to check if hand is widely open.
        if (!isHandOpen) continue;

        const fingerWebs: { [key: string]: number[] } = {
          indexMiddle: [5, 9, 6, 10],
          middleRing: [9, 13, 10, 14],
          ringLittle: [13, 17, 14, 18],
        };

        let isHandStretched = true;

        for (const finger in fingerWebs) {
          const [a, b, c, d] = fingerWebs[finger];

          const midPoint = this.midPoint(
            landmarks[a].x,
            landmarks[a].y,
            landmarks[b].x,
            landmarks[b].y,
          );
          const isFingerWide = this.checkIfFingersAreWide(landmarks[c], midPoint, landmarks[d]);
          // console.log(`${finger} angle::`, this.getAngle(landmarks[c], midPoint, landmarks[d]));
          if (isFingerWide === false) {
            isHandStretched = false;
            break;
          }
        }

        const isFingerWide = this.checkIfFingersAreWide(landmarks[3], landmarks[2], landmarks[5]);
        if (isFingerWide === false) {
          isHandStretched = false;
        }

        if (isHandOpen && isHandStretched) {
          status[hand] = true;
        }
      }

      if (status['left'] && status['right']) {
        return 'both-hands';
      } else if (status['left'] && !status['right']) {
        return 'left-hand';
      } else if (!status['left'] && status['right']) {
        return 'right-hand';
      } else {
        return 'none';
      }
    }

    return 'unknown';
  }
}
