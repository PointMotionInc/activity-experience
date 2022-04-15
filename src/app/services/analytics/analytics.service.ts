import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  ActivityEvent,
  ActivityEventRow,
  AnalyticsEvent,
  AnalyticsRow,
  AnalyticsSessionEvent,
  AnalyticsSessionEventRow,
  SessionState,
  TaskEvent,
  TaskEventRow,
} from 'src/app/types/pointmotion';
import { environment } from 'src/environments/environment';
import { GqlClientService } from '../gql-client/gql-client.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  sessionId = '';
  constructor(
    private gql: GqlClientService,
    private store: Store<{ session: SessionState }>
  ) {
    this.store
      .select((state) => state.session.session?.id)
      .subscribe((sid) => {
        this.sessionId = sid || '';
      });
  }

  // TODO: batch events, save them in localStorage and let a webworker process the queue
  async sendEvent(event: AnalyticsEvent) {
    if (this.sessionId) {
      const analyticsRow: AnalyticsRow = {
        patient: environment.patient, // TODO remove hardcoded
        session: this.sessionId, // TODO remove hardcoded
        activity: event.activity,
        task_id: event.task_id,
        task_name: event.task_name,
        attempt_id: event.attempt_id,
        event_type: event.event_type,
        created_at: new Date().getTime(),
        score: event.score,
      };
      return this.gql.req(
        `mutation InsertEvent($patient: uuid, $session: uuid, $activity: uuid, $task_id: uuid, $attempt_id: uuid, $task_name: String, $event_type: String, $created_at: bigint!, $score: float8 ) {
        insert_events_one(object:
          {
            patient: $patient,
            session: $session,
            activity: $activity,
            task_id: $task_id,
            attempt_id: $attempt_id,
            task_name: $task_name,
            event_type: $event_type,
            created_at: $created_at,
            score: $score
          }) {
            id
        }
      }`,
        analyticsRow
      );
    }
  }

  async sendSessionEvent(event: AnalyticsSessionEvent) {
    if (this.sessionId) {
      const sessionEventRow: AnalyticsSessionEventRow = {
        patient: environment.patient, // TODO remove hardcoded
        session: this.sessionId, // TODO remove hardcoded
        event_type: event.event_type,
        created_at: new Date().getTime(),
      };

      if (event.event_type === 'sessionEnded') {
        console.log(this.sendSessionEndedAt());
      }
      return this.gql.req(
        `mutation InsertEvent($patient: uuid, $session: uuid, $event_type: String, $created_at: bigint! ) {
      insert_events_one(object:
        {
          patient: $patient,
          session: $session,
          event_type: $event_type,
          created_at: $created_at,
        }) {
          id
      }
    }`,
        sessionEventRow
      );
    }
  }

  async sendActivityEvent(event: ActivityEvent) {
    if (this.sessionId) {
      const activityEventRow: ActivityEventRow = {
        patient: environment.patient, // TODO remove hardcoded
        session: this.sessionId, // TODO remove hardcoded
        activity: event.activity,
        event_type: event.event_type,
        created_at: new Date().getTime(),
      };
      return this.gql.req(
        `mutation InsertEvent($patient: uuid, $session: uuid, $activity: uuid, $event_type: String, $created_at: bigint! ) {
      insert_events_one(object:
        {
          patient: $patient,
          session: $session,
          activity: $activity,
          event_type: $event_type,
          created_at: $created_at,
        }) {
          id
      }
    }`,
        activityEventRow
      );
    }
  }

  async sendTaskEvent(event: TaskEvent) {
    if (this.sessionId) {
      let taskEventRow: TaskEventRow = {
        patient: environment.patient, // TODO remove hardcoded
        session: this.sessionId, // TODO remove hardcoded
        activity: event.activity,
        task_id: event.task_id,
        attempt_id: event.attempt_id,
        task_name: event.task_name,
        event_type: event.event_type,
        created_at: new Date().getTime(),
      };

      if (!(event.score && event.event_type === 'taskEnded')) {
        return this.gql.req(
          `mutation InsertEvent($patient: uuid, $session: uuid, $activity: uuid,$task_id: uuid, $attempt_id: uuid, $task_name: String, $event_type: String, $created_at: bigint! ) {
				insert_events_one(object:
					{
						patient: $patient,
						session: $session,
						activity: $activity,
						task_id: $task_id, 
						attempt_id: $task_id, 
						task_name: $task_id,
						event_type: $event_type,
						created_at: $created_at
					}) {
						id
				}
			}`,
          taskEventRow
        );
      } else {
        taskEventRow['score'] = event.score;
        return this.gql.req(
          `mutation InsertEvent($patient: uuid, $session: uuid, $activity: uuid, $task_id: uuid, $attempt_id: uuid, $task_name: String, $event_type: String, $created_at: bigint!, $score: float8 ) {
				insert_events_one(object:
					{
						patient: $patient,
						session: $session,
						activity: $activity,
						task_id: $task_id, 
						attempt_id: $task_id, 
						task_name: $task_id,
						event_type: $event_type,
						created_at: $created_at,
						score: $score
					}) {
						id
				}
			}`,
          taskEventRow
        );
      }
    }
  }

  async sendSessionEndedAt() {
    if (this.sessionId) {
      const sessionEndedAtRow: { endedAt: Date; sessionId: string } = {
        endedAt: new Date(),
        sessionId: this.sessionId, // TODO remove hardcoded
      };
      return this.gql.req(
        `mutation SetSessionEnded($endedAt: timestamptz = "", $sessionId: uuid = "") {
  		update_session(_set: {endedAt: $endedAt}, where: {id: {_eq: $sessionId}}) {
    		affected_rows
  		}
		}`,
        sessionEndedAtRow
      );
    }
  }

  getActivityId(name: string) {
    switch (name) {
      case 'Calibration':
        return 'd97e90d4-6c7f-4013-94f7-ba61fd52acdc';
      case 'Sit to Stand':
        return '0fa7d873-fd22-4784-8095-780028ceb08e';
      default:
        console.error(name);
        throw new Error('Activity not found ');
    }
  }
}
