import { Subject } from 'rxjs';

export class GameElement<T> {
  _state: T;
  _subject: Subject<T>;

  get state() {
    return this._state;
  }

  set state(state: T) {
    this._state = state;
    this._subject.next(this.state);
  }

  get subject() {
    return this._subject;
  }

  set subject(subject: Subject<T>) {
    this._subject = subject;
  }
}