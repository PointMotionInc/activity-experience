import { CUSTOM_ELEMENTS_SCHEMA, Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { SessionComponent } from './pages/session/session.component';
import { GuideComponent } from './widgets/guide/guide.component';
import { SpotlightComponent } from './widgets/spotlight/spotlight.component';
import { VideoComponent } from './widgets/video/video.component';
import { CalibrationComponent } from './widgets/calibration/calibration.component';
import { StoreModule } from '@ngrx/store';
import { guideReducer } from './store/reducers/guide.reducer';
import { sessionReducer } from './store/reducers/session.reducer';
import { spotlightReducer } from './store/reducers/spotlight.reducer';
import { AnnouncementComponent } from './widgets/announcement/announcement.component';
import { PreSessionSurveyComponent } from './widgets/pre-session-survey/pre-session-survey.component';
import { SelectGenreComponent } from './widgets/select-genre/select-genre.component';
import { FinishedComponent } from './pages/finished/finished.component';
import { TestComponent } from './pages/test/test.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { announcementReducer } from './store/reducers/annoucement.reducer';
import { SafePipeModule } from 'safe-pipe';
import { ElementsComponent } from './widgets/elements/elements.component';
import { GameComponent } from './pages/game/game.component';
import { ScoreComponent } from './widgets/elements/score/score.component';
import { TimerComponent } from './widgets/elements/timer/timer.component';
import { PromptComponent } from './widgets/elements/prompt/prompt.component';
import { TimeoutComponent } from './widgets/elements/timeout/timeout.component';
import { RibbonComponent } from './widgets/elements/ribbon/ribbon.component';
import { OverlayComponent } from './widgets/elements/overlay/overlay.component';
import { BannerComponent } from './widgets/elements/banner/banner.component';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';

export let AppInjector: Injector;

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    SessionComponent,
    GuideComponent,
    SpotlightComponent,
    VideoComponent,
    CalibrationComponent,
    AnnouncementComponent,
    PreSessionSurveyComponent,
    SelectGenreComponent,
    FinishedComponent,
    TestComponent,
    ElementsComponent,
    GameComponent,
    ScoreComponent,
    TimerComponent,
    PromptComponent,
    TimeoutComponent,
    RibbonComponent,
    OverlayComponent,
    BannerComponent,
    SafeHtmlPipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    StoreModule.forRoot({
      guide: guideReducer, // Updating the guide
      session: sessionReducer, // Top level session
      spotlight: spotlightReducer, // spotlight component
      announcement: announcementReducer,
    }),
    FontAwesomeModule,
    SafePipeModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {
  constructor(private injector: Injector) {
    AppInjector = this.injector;
  }
}
