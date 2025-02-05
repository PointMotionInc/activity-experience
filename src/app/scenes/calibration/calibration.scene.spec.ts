import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Results } from '@mediapipe/pose';
import { Store } from '@ngrx/store';
import { GameComponent } from 'src/app/pages/game/game.component';
import { GameStateService } from 'src/app/services/game-state/game-state.service';
import { GameService } from 'src/app/services/game/game.service';
import { GoogleAnalyticsService } from 'src/app/services/google-analytics/google-analytics.service';
import { GqlClientService } from 'src/app/services/gql-client/gql-client.service';
import { PoseModelAdapter } from 'src/app/services/pose-model-adapter/pose-model-adapter.service';
import { UserService } from 'src/app/services/user/user.service';
import { CalibrationScene } from './calibration.scene';

describe('CalibrationScene', () => {
  let service: CalibrationScene;
  let game: Phaser.Game;
  let poseModelAdapter: PoseModelAdapter;
  const canvasWidth = 1792;
  const canvasHeight = 1007;

  // mock results and canvas details to test calibration
  const calibratedPoseResults: Pick<Results, 'poseLandmarks'> = {
    poseLandmarks: [
      {
        x: 0.5309268832206726,
        y: 0.16922087967395782,
        z: -0.2282911092042923,
        visibility: 0.9999962449073792,
      },
      {
        x: 0.5353615283966064,
        y: 0.15612584352493286,
        z: -0.2140180617570877,
        visibility: 0.9999855756759644,
      },
      {
        x: 0.5375186800956726,
        y: 0.15652376413345337,
        z: -0.2140618860721588,
        visibility: 0.9999846816062927,
      },
      {
        x: 0.5401343107223511,
        y: 0.15686750411987305,
        z: -0.2140618860721588,
        visibility: 0.9999842643737793,
      },
      {
        x: 0.5260557532310486,
        y: 0.1559658944606781,
        z: -0.2144414484500885,
        visibility: 0.9999843835830688,
      },
      {
        x: 0.522473156452179,
        y: 0.15641091763973236,
        z: -0.21444182097911835,
        visibility: 0.9999836683273315,
      },
      {
        x: 0.5195726752281189,
        y: 0.15697355568408966,
        z: -0.2144417017698288,
        visibility: 0.9999834299087524,
      },
      {
        x: 0.5441374778747559,
        y: 0.1657678335905075,
        z: -0.12464509159326553,
        visibility: 0.9999732971191406,
      },
      {
        x: 0.5147745609283447,
        y: 0.16750729084014893,
        z: -0.126882404088974,
        visibility: 0.9999673366546631,
      },
      {
        x: 0.5359150767326355,
        y: 0.18653704226016998,
        z: -0.19458715617656708,
        visibility: 0.9999948143959045,
      },
      {
        x: 0.524621844291687,
        y: 0.18758291006088257,
        z: -0.19533824920654297,
        visibility: 0.9999934434890747,
      },
      {
        x: 0.568425714969635,
        y: 0.2644989490509033,
        z: -0.06504364311695099,
        visibility: 0.9999814629554749,
      },
      {
        x: 0.4928365647792816,
        y: 0.2587945759296417,
        z: -0.06294584274291992,
        visibility: 0.9999734163284302,
      },
      {
        x: 0.5806306004524231,
        y: 0.36962491273880005,
        z: -0.017030799761414528,
        visibility: 0.9905900955200195,
      },
      {
        x: 0.4778107702732086,
        y: 0.3690553307533264,
        z: -0.02451303042471409,
        visibility: 0.9812389612197876,
      },
      {
        x: 0.5969548225402832,
        y: 0.46090275049209595,
        z: -0.09337128698825836,
        visibility: 0.984775185585022,
      },
      {
        x: 0.4607425332069397,
        y: 0.4603809416294098,
        z: -0.1021076887845993,
        visibility: 0.972942054271698,
      },
      {
        x: 0.6013237237930298,
        y: 0.49054837226867676,
        z: -0.11472763866186142,
        visibility: 0.9674825072288513,
      },
      {
        x: 0.4553842544555664,
        y: 0.4917130470275879,
        z: -0.1254875212907791,
        visibility: 0.9475940465927124,
      },
      {
        x: 0.5971983671188354,
        y: 0.49068471789360046,
        z: -0.1447354257106781,
        visibility: 0.9703102111816406,
      },
      {
        x: 0.45854902267456055,
        y: 0.4910869300365448,
        z: -0.15766248106956482,
        visibility: 0.952237606048584,
      },
      {
        x: 0.5944200158119202,
        y: 0.4827406108379364,
        z: -0.10691889375448227,
        visibility: 0.9636757969856262,
      },
      {
        x: 0.4617408215999603,
        y: 0.4835831820964813,
        z: -0.11726014316082001,
        visibility: 0.9471015334129333,
      },
      {
        x: 0.5567737221717834,
        y: 0.4690495431423187,
        z: -0.002262236550450325,
        visibility: 0.9997970461845398,
      },
      {
        x: 0.5105863809585571,
        y: 0.4698319733142853,
        z: 0.0022169623989611864,
        visibility: 0.9998104572296143,
      },
      {
        x: 0.558428168296814,
        y: 0.6273779273033142,
        z: -0.00769594544544816,
        visibility: 0.9931877851486206,
      },
      {
        x: 0.5083616971969604,
        y: 0.6264130473136902,
        z: 0.00017940765246748924,
        visibility: 0.9929853677749634,
      },
      {
        x: 0.562896728515625,
        y: 0.7557618021965027,
        z: 0.12939712405204773,
        visibility: 0.989575207233429,
      },
      {
        x: 0.5047414898872375,
        y: 0.7647066116333008,
        z: 0.12977483868598938,
        visibility: 0.9903064370155334,
      },
      {
        x: 0.5563898682594299,
        y: 0.7729536294937134,
        z: 0.1360371708869934,
        visibility: 0.845815122127533,
      },
      {
        x: 0.511657178401947,
        y: 0.7806233167648315,
        z: 0.13594941794872284,
        visibility: 0.8631284832954407,
      },
      {
        x: 0.5685957670211792,
        y: 0.8105059266090393,
        z: 0.031120147556066513,
        visibility: 0.9829500317573547,
      },
      {
        x: 0.49227374792099,
        y: 0.8134823441505432,
        z: 0.03156239911913872,
        visibility: 0.984714150428772,
      },
    ],
  };

  beforeAll(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GameComponent],
      providers: [
        CalibrationScene,
        UserService,
        { provide: ActivatedRoute, useValue: {} },
        { provide: Store, useValue: {} },
        GameStateService,
        GqlClientService,
        GoogleAnalyticsService,
        { provide: GameService, useValue: {} },
      ],
    }).compileComponents();
    poseModelAdapter = TestBed.inject(PoseModelAdapter);
    service = TestBed.inject(CalibrationScene);
    service = new CalibrationScene(poseModelAdapter);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.HEADLESS,
      width: canvasWidth,
      height: canvasHeight,
      // parent: 'phaser-canvas',
      render: {
        transparent: true,
      },
      transparent: true,
      // backgroundColor: 'rgba(0,0,0,0)',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 200 },
        },
      },
      scene: [service],
    };
    service.game = new Phaser.Game(config);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should run create method of the scene', () => {
    expect(service.game).toBeTruthy();
    service.create();
    expect().nothing();
  });

  it('should create calibration box', () => {
    expect(service.game).toBeTruthy();
    service.createCalibrationBox(40, 98);
    expect(service.calibrationRectangle.left).toBeTruthy();
    expect(service.calibrationRectangle.right).toBeTruthy();
    expect(service.calibrationRectangle.top).toBeTruthy();
    expect(service.calibrationRectangle.bottom).toBeTruthy();
    expect(service.calibrationRectangle.center).toBeTruthy();
  });

  it('should draw calibration points', () => {
    service.drawCalibrationPoints(
      calibratedPoseResults as Results,
      [12, 11, 24, 23, 26, 25],
      [],
      canvasWidth,
      canvasHeight,
    );
    expect().nothing();
  });

  // it('should destroy graphics', () => {
  //   service.destroyGraphics();
  //   expect(service.graphics).toBeUndefined();
  // });
});
