import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { interval, Subscription, switchMap, filter, catchError, of, forkJoin } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class RealtimeNotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private lastNotifId = signal<number | null>(null);
  private lastInviteCount = signal<number | null>(null);
  private pollingSub?: Subscription;
  private audioAnnounce: HTMLAudioElement;
  private audioInvite: HTMLAudioElement;

  constructor() {
    // Announcements: Clear ping
    this.audioAnnounce = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    this.audioAnnounce.volume = 0.6;
    
    // Invitations: "Success" chime - more prominent "Ring"
    this.audioInvite = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    this.audioInvite.volume = 0.8;
  }

  startWatching(): void {
    if (this.pollingSub) return;

    console.log('📡 Real-time Notification Watcher: ACTIVE');

    // Check every 5 seconds for new events
    this.pollingSub = interval(5000)
      .pipe(
        switchMap(() => {
          const obs: any = {
            announcements: this.api.getMyAnnouncements().pipe(catchError(() => of({ data: [] }))),
          };
          
          if (this.auth.isStudent()) {
            obs.enrollments = this.api.getMyEnrollments().pipe(catchError(() => of({ data: [] })));
          }
          
          if (this.auth.isInstructor()) {
            obs.instructorAnnouncements = this.api.getInstructorAnnouncements().pipe(catchError(() => of({ data: [] })));
          }

          return forkJoin(obs);
        })
      )
      .subscribe((res: any) => {
        // 1. Handle Announcements (Student or Global)
        const studentNotifs = res.announcements?.data || [];
        const instructorNotifs = res.instructorAnnouncements?.data || [];
        const allNotifs = [...studentNotifs, ...instructorNotifs];
        
        if (allNotifs.length > 0) {
          // Sort by ID to get the newest
          allNotifs.sort((a, b) => b.id - a.id);
          const latest = allNotifs[0];
          
          if (this.lastNotifId() !== null && latest.id > (this.lastNotifId() || 0)) {
            const sourceName = latest.is_global ? 'Admin' : (latest.courseCode || 'Instructor');
            this.playAlert(`📢 NEW ANNOUNCEMENT from ${sourceName}: ${latest.title}`, 'announcement');
            this.api.triggerRefresh('announcements');
          }
          this.lastNotifId.set(latest.id);
        }

        // 2. Handle New Invitations (Students only)
        if (res.enrollments) {
          const invites = (res.enrollments.data || []).filter((e: any) => e.enrollmentStatus === 'pending');
          if (this.lastInviteCount() !== null && invites.length > (this.lastInviteCount() || 0)) {
            const newInvite = invites[0];
            this.playAlert(`🎓 NEW CLASS INVITATION\nYou have been invited to ${newInvite.courseCode} — ${newInvite.sectionName}`, 'invitation');
            this.api.triggerRefresh('enrollments');
          }
          this.lastInviteCount.set(invites.length);
        }
      });
  }

  stopWatching(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = undefined;
  }

  private playAlert(message: string, type: 'announcement' | 'invitation'): void {
    // Play the appropriate sound
    if (type === 'announcement') {
      this.audioAnnounce.play().catch(e => console.warn('Audio play failed:', e));
    } else {
      this.audioInvite.play().catch(e => console.warn('Audio play failed:', e));
    }

    // Show a premium toast with distinct styling
    if (type === 'invitation') {
      this.toast.success(message, 10000); // Success for invitations
    } else {
      this.toast.info(message, 8000); // Info for announcements
    }
  }
}

