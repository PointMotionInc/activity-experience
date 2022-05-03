import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-widget-calibration',
  templateUrl: './calibration.component.html',
  styleUrls: ['./calibration.component.scss']
})
export class CalibrationComponent implements OnInit {

  calibration$: Observable<any>
  status?: string = ''
  constructor(
    private store: Store<{ calibration: any; frame: any }>
  ) {
    this.calibration$ = this.store.select((state) => state.calibration.status)
  }

  ngOnInit(): void {
    this.calibration$.subscribe((result) => {
      this.status = result
    })
  }

}
