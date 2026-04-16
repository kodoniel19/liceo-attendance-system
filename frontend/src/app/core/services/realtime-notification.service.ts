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
  private lastInviteCount = signal<number>(0);
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
    
    // Check every 10 seconds for new events (Announcements & Invites)
    this.pollingSub = interval(10000)
      .pipe(
        filter(() => this.auth.isStudent()),
        switchMap(() => forkJoin({
          announcements: this.api.getMyAnnouncements().pipe(catchError(() => of({ data: [] }))),
          enrollments: this.api.getMyEnrollments().pipe(catchError(() => of({ data: [] })))
        }))
      )
      .subscribe((res: any) => {
        // 1. Handle Announcements
        const notifs = res.announcements.data || [];
        if (notifs.length > 0) {
          const latest = notifs[0];
          if (this.lastNotifId() !== null && latest.id > (this.lastNotifId() || 0)) {
            this.playAlert(`📢 NEW ANNOUNCEMENT\n${latest.courseCode}: ${latest.title}`);
          }
          this.lastNotifId.set(latest.id);
        }

        // 2. Handle New Invitations
        const invites = (res.enrollments.data || []).filter((e: any) => e.enrollmentStatus === 'pending');
        if (this.lastInviteCount() !== null && invites.length > this.lastInviteCount()) {
          const newInvite = invites[0];
          this.playAlert(`🎓 NEW CLASS INVITATION\nYou have been invited to ${newInvite.courseCode} — ${newInvite.sectionName}`);
        }
        this.lastInviteCount.set(invites.length);
      });
  }

  stopWatching(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  private playAlert(message: string): void {
    // Play the ringtone
    this.audio.play().catch(e => console.warn('Audio play failed:', e));
    
    // Show a premium toast
    this.toast.info(message, 8000);
  }
}
