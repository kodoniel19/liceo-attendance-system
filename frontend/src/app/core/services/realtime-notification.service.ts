import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { interval, Subscription, switchMap, filter, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeNotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private lastNotifId = signal<number | null>(null);
  private pollingSub?: Subscription;
  private audio: HTMLAudioElement;

  constructor() {
    // Liceo Notification Ringtone (Short, crisp ping)
    this.audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    this.audio.volume = 0.5;
  }

  startWatching(): void {
    if (this.pollingSub) return;

    console.log('📡 Real-time Notification Watcher: ACTIVE');
    
    // Check every 15 seconds for new announcements
    this.pollingSub = interval(15000)
      .pipe(
        filter(() => this.auth.isStudent()), // Only poll for students
        switchMap(() => this.api.getMyAnnouncements().pipe(catchError(() => of({ data: [] }))))
      )
      .subscribe((res: any) => {
        const notifs = res.data || [];
        if (notifs.length > 0) {
          const latest = notifs[0];
          
          // If this ID is newer than what we last saw, play sound!
          if (this.lastNotifId() !== null && latest.id > (this.lastNotifId() || 0)) {
            this.playAlert(latest);
          }
          
          this.lastNotifId.set(latest.id);
        }
      });
  }

  stopWatching(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  private playAlert(notif: any): void {
    // Play the ringtone
    this.audio.play().catch(e => console.warn('Audio play failed:', e));
    
    // Show a premium toast
    this.toast.info(`📢 NEW ANNOUNCEMENT\n${notif.courseCode}: ${notif.title}`, 8000);
  }
}
