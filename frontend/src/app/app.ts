import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RealtimeNotificationService } from './core/services/realtime-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class App implements OnInit {
  private notif = inject(RealtimeNotificationService);

  ngOnInit(): void {
    this.notif.startWatching();
  }
}
