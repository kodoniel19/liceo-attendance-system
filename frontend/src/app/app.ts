import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { RealtimeNotificationService } from './core/services/realtime-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class App implements OnInit {
  private notif = inject(RealtimeNotificationService);
  private router = inject(Router);

  ngOnInit(): void {
    this.notif.startWatching();

    // GLOBAL SCROLL RESET FOR ALL PORTALS
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Force non-smooth jump for technical reliability
      const fastScroll = (el: any) => { if (el) el.scrollTo({ top: 0, behavior: 'auto' }); };
      
      fastScroll(window);
      fastScroll(document.body);
      fastScroll(document.documentElement);

      // Target layout containers multiple times to catch delayed rendering
      const forceTop = () => {
        const containers = document.querySelectorAll('.main-content, .admin-content, mat-sidenav-content, .content-wrapper');
        containers.forEach(el => el.scrollTop = 0);
      };

      forceTop();
      setTimeout(forceTop, 50);
      setTimeout(forceTop, 150);
      setTimeout(forceTop, 300); // 300ms fallback for slow-rendering charts
    });
  }
}
