import { Component, OnInit, signal, computed, inject, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ClassSection } from '../../core/models';
import { Subscription, timer } from 'rxjs';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="layout-container">
      <mat-sidenav-container class="sidenav-container">
        <!-- Sidebar -->
        <mat-sidenav
          #sidenav
          [mode]="isMobile() ? 'over' : 'side'"
          [opened]="!isMobile()"
          class="sidebar">

          <!-- Brand -->
          <div class="sidebar__brand">
            <img src="assets/images/logo.png" alt="LDCU Seal" class="sidebar__logo-img">
            <div class="sidebar__brand-text">
              <span class="sidebar__brand-name">Liceo</span>
              <span class="sidebar__brand-sub">Attendance System</span>
            </div>
            
            <!-- Notification Bell (Desktop) -->
            <button mat-icon-button class="notification-bell desktop-notif" [matMenuTriggerFor]="notifMenu" [class.pulse-active]="hasUnread()" (menuOpened)="markAsRead()">
               <mat-icon [class.pulse]="hasUnread()">{{ hasUnread() ? 'notifications_active' : 'notifications' }}</mat-icon>
               <span *ngIf="unreadCount() > 0" class="notif-badge">{{ unreadCount() }}</span>
            </button>
            <mat-menu #notifMenu="matMenu" class="modern-notif-menu">
               <div class="notif-menu-header">Recent Announcements</div>
               <button mat-menu-item *ngFor="let a of recentAnnouncements()" (click)="navigateToSubject(a.sectionId)">
                  <div class="notif-item">
                     <div class="notif-dot"></div>
                     <div class="notif-item-body">
                        <div class="notif-item-title">{{ a.title }}</div>
                        <div class="notif-item-meta">{{ a.isGlobal ? 'Admin' : (a.instructorFirst + ' ' + a.instructorLast) }} • {{ a.isGlobal ? 'System' : a.courseCode }}</div>
                        <div class="notif-item-time">{{ a.created_at | date:'shortTime' }}</div>
                     </div>
                  </div>
               </button>
               <div *ngIf="recentAnnouncements().length === 0" class="notif-empty">No unread announcements</div>
               <div class="notif-menu-footer" *ngIf="recentAnnouncements().length > 0">
                  <button mat-button color="primary" routerLink="/student/notifications" style="width: 100%; border-radius: 0; font-size: 0.75rem; font-weight: 700;">VIEW ALL NOTIFICATIONS</button>
               </div>
            </mat-menu>
          </div>

          <!-- Navigation -->
          <nav class="sidebar__nav">
            <!-- Top Nav -->
            <a [routerLink]="'/student/dashboard'" routerLinkActive="active" class="sidebar__nav-item" (click)="isMobile() && sidenav.close()">
              <span class="material-icons sidebar__nav-icon">dashboard</span>
              <span class="sidebar__nav-label">Dashboard</span>
            </a>
            <a [routerLink]="'/student/scan'" routerLinkActive="active" class="sidebar__nav-item" (click)="isMobile() && sidenav.close()">
              <span class="material-icons sidebar__nav-icon">qr_code_scanner</span>
              <span class="sidebar__nav-label">Scan QR</span>
            </a>

            <!-- Enrolled Section -->
            <div class="sidebar__section-header-pill" (click)="showSubjects.set(!showSubjects())" style="cursor:pointer">
              <span class="material-icons">school</span>
              <span class="sidebar__section-label">Enrolled</span>
              <span class="material-icons" [style.transform]="showSubjects() ? 'rotate(0deg)' : 'rotate(-90deg)'" style="margin-left:auto; font-size:18px; transition: transform 0.2s">expand_more</span>
            </div>

            <div class="sidebar__subjects" *ngIf="showSubjects()">
              <div *ngIf="loadingSections()" class="sidebar__loading">
                  <mat-spinner diameter="18"></mat-spinner>
              </div>
              <a *ngFor="let s of enrollment()" 
                  [routerLink]="['/student/subjects', s.id]" 
                  class="sidebar__g-item"
                  routerLinkActive="active"
                  (click)="isMobile() && sidenav.close()">
                  <div class="g-item__avatar" [style.background]="getAvatarColor(s.courseCode || '')">
                    {{ (s.courseCode || '?')[0] }}
                  </div>
                  <div class="g-item__content" [matTooltip]="s.courseName || ''" matTooltipPosition="right">
                    <div class="g-item__title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ s.courseName }}</div>
                    <div class="g-item__sub">
                      {{ s.courseCode }} 
                      <span *ngIf="!isRedundant(s)"> • {{ s.sectionName }}</span>
                    </div>
                  </div>
              </a>
              <div *ngIf="!loadingSections() && !enrollment().length" class="sidebar__empty">
                  None enrolled
              </div>
            </div>

            <a [routerLink]="'/student/history'" routerLinkActive="active" class="sidebar__nav-item" (click)="isMobile() && sidenav.close()">
              <span class="material-icons sidebar__nav-icon">history</span>
              <span class="sidebar__nav-label">History</span>
            </a>
            <a [routerLink]="'/student/notifications'" routerLinkActive="active" class="sidebar__nav-item" (click)="isMobile() && sidenav.close()">
              <span class="material-icons sidebar__nav-icon">campaign</span>
              <span class="sidebar__nav-label">Announcements</span>
            </a>
          </nav>

          <!-- Footer -->
          <div class="sidebar-footer">
            <div class="sidebar-user" [routerLink]="'/student/profile'" (click)="isMobile() && sidenav.close()">
              <div class="user-avatar">{{ userInitials() }}</div>
              <div>
                <div class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
                <div class="user-role">Student</div>
              </div>
            </div>
            <button class="logout-btn" (click)="showLogoutConfirm.set(true)">
               <span class="material-icons">logout</span>
               <span>Sign Out</span>
            </button>
          </div>
        </mat-sidenav>

        <!-- Main content -->
        <mat-sidenav-content class="main-content">
          <!-- Top bar (mobile) -->
          <div class="topbar" *ngIf="isMobile()">
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
            <span class="topbar__title">Liceo Attendance</span>
          </div>

          <div class="content-wrapper" #mainContent>
            <router-outlet (activate)="onRouteActivate()" />
          </div>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>

    <!-- Logout Confirmation Modal -->
    <div class="modal-overlay" *ngIf="showLogoutConfirm()" (click)="showLogoutConfirm.set(false)">
      <div class="logout-modal animate-fade-in-up" (click)="$event.stopPropagation()">
        <div class="logout-modal__header">
          <div class="logout-icon-wrapper">
            <mat-icon>logout</mat-icon>
          </div>
          <h3>Sign Out?</h3>
          <p>Are you sure you want to log out of your student account?</p>
        </div>
        <div class="logout-modal__footer">
          <button mat-button (click)="showLogoutConfirm.set(false)">Cancel</button>
          <button mat-raised-button color="warn" (click)="confirmLogout()">Sign Out</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidenav-container { height: 100dvh; }
    .layout-container { height: 100dvh; display: flex; flex-direction: column; }

    /* Notification Bell */
    .notification-bell {
       margin-left: auto; color: #C9A227; position: relative; /* Gold for visibility */
       width: 36px !important; height: 36px !important; line-height: 36px !important;
       .mat-icon { font-size: 20px; }
    }
    .desktop-notif { margin-left: 8px; }
    .notif-badge {
       position: absolute; top: 4px; right: 4px;
       background: #ef4444; color: white; font-size: 9px; font-weight: 800;
       width: 14px; height: 14px; border-radius: 50%;
       display: flex; align-items: center; justify-content: center;
       border: 1px solid white;
    }
    .modern-notif-menu {
       width: 280px; border-radius: 16px !important; overflow: hidden;
       box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
    }
    .notif-menu-header { padding: 12px 16px; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; color: var(--color-primary); border-bottom: 1px solid #eee; background: #fdfdfd; }
    .notif-item { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
    .notif-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; flex-shrink: 0; }
    .notif-item-body { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .notif-item-title { font-weight: 700; font-size: 0.82rem; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notif-item-meta { font-size: 0.7rem; color: #666; font-weight: 500; }
    .notif-item-time { font-size: 0.65rem; color: #999; margin-top: 1px; }
    .notif-empty { padding: 24px; text-align: center; color: #999; font-size: 0.82rem; }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, #8B1A1A 0%, #3e0909 100%);
      color: white;
      border-right: none !important;
    }
    
    ::ng-deep .sidebar .mat-drawer-inner-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .sidebar__brand {
      display: flex; align-items: center; gap: 12px;
      padding: 24px 20px 20px;
    }
    .sidebar__logo-img {
      width: 44px; height: 44px;
      flex-shrink: 0;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
    }
    .sidebar__brand-name { display: block; font-weight: 800; font-size: 1.1rem; color: #fff; line-height: 1.1; }
    .sidebar__brand-sub  { display: block; font-size: 0.68rem; color: rgba(255, 255, 255, 0.5); margin-top: 2px; }

    .sidebar__nav { flex: 1; padding: 12px 12px; display: flex; flex-direction: column; gap: 4px; }
    .sidebar__nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; 
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none; border-radius: 10px;
      font-size: 0.875rem; font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover { background: rgba(255, 255, 255, 0.1); color: white; }
      &.active { background: rgba(201, 162, 39, 0.2); color: #C9A227; border-left: 3px solid #C9A227; }
    }
    .sidebar__nav-icon { font-size: 20px; }
    .sidebar__nav-label { font-size: 0.875rem; font-weight: 600; text-transform: none; letter-spacing: normal; }

    .sidebar__section-header-pill { 
      display: flex; align-items: center; gap: 12px; 
      padding: 12px 16px; margin: 4px 0;
      color: rgba(255,255,255,0.7);
      transition: all 0.2s;
      .material-icons { font-size: 20px; }
    }
    .sidebar__section-label { 
      font-size: 0.875rem; font-weight: 500; text-transform: none; letter-spacing: normal; 
    }

    .sidebar__subjects { 
      display: flex; flex-direction: column; gap: 2px; padding: 0; 
      animation: subFadeIn 0.5s ease-out;
    }
    
    .sidebar__g-item {
       display: flex; align-items: center; gap: 12px; 
       padding: 8px 16px; border-radius: 0 24px 24px 0;
       margin-right: 8px;
       color: rgba(255,255,255,0.85); text-decoration: none; transition: all 0.2s;
       
       &:hover { background: rgba(255,255,255,0.08); color: white; }
       &.active { 
         background: rgba(201,162,39,0.15); 
         color: #C9A227;
         .g-item__avatar { border: 2px solid #C9A227; }
         .g-item__title { color: #C9A227; }
       }
    }

    .g-item__avatar {
       width: 28px; height: 28px; border-radius: 50%;
       display: flex; align-items: center; justify-content: center;
       font-weight: 700; font-size: 0.75rem; color: white;
       flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
       margin-left: -4px;
    }
    .g-item__content { flex: 1; min-width: 0; }
    .g-item__title { font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
    .g-item__sub { font-size: 0.72rem; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

    .sidebar__loading, .sidebar__empty { padding: 10px 16px; font-size: 0.75rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 8px; }

    .sidebar-footer {
      padding: 16px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; gap: 12px; margin-top: auto;
    }
    .sidebar-user { 
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      padding: 6px; border-radius: 10px; transition: background 0.2s;
    }
    .sidebar-user:hover { background: rgba(255,255,255,0.05); }
    .user-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #e94560, #c23152);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.8rem; flex-shrink: 0;
    }
    .user-name { font-size: 0.8rem; font-weight: 700; color: white; }
    .user-role { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; }
    .logout-btn {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 10px 14px; background: rgba(233,69,96,0.1);
      border: 1px solid rgba(233,69,96,0.2); border-radius: 10px;
      color: rgba(255,255,255,0.6); font-size: 0.875rem; cursor: pointer;
      transition: all 0.2s;
      .material-icons { font-size: 18px; }
      &:hover { background: rgba(233,69,96,0.25); color: #e94560; }
    }

    /* Content */
    .main-content { background: var(--color-bg); overflow-y: auto; }
    .topbar {
      display: flex; align-items: center;
      padding: 0 8px;
      height: 56px;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      position: sticky; top: 0; z-index: 100;
      gap: 8px;
    }
    .topbar__title { font-weight: 700; color: var(--color-primary); flex: 1; }
    .content-wrapper { padding: 0; min-height: 100%; }

    mat-divider { border-color: rgba(255, 255, 255, 0.1) !important; margin: 4px 0; }

    /* Logout Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .logout-modal {
      background: white; border-radius: 20px; width: 100%; max-width: 320px;
      padding: 32px 24px; text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    }
    .logout-icon-wrapper {
      width: 56px; height: 56px; border-radius: 50%;
      background: #fee2e2; color: #ef4444;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }
    .logout-modal h3 { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin: 0 0 8px; }
    .logout-modal p { font-size: 0.875rem; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
    .logout-modal__footer { display: flex; flex-direction: column; gap: 8px; }
    .logout-modal__footer button { width: 100%; border-radius: 10px; padding: 6px 0; }

    mat-divider { border-color: rgba(255, 255, 255, 0.1) !important; margin: 4px 0; }

    .notification-bell.pulse-active {
      background: rgba(139, 26, 26, 0.05);
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
      animation: bellGlow 1.5s infinite alternate;
    }
    @keyframes bellGlow {
      from { box-shadow: 0 0 5px rgba(255, 215, 0, 0.1); }
      to { box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
    }
  `]
})
export class StudentLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('mainContent') mainContent?: ElementRef<HTMLDivElement>;
  
  auth = inject(AuthService);
  api = inject(ApiService);
  router = inject(Router);
  private bp = inject(BreakpointObserver);


  isMobile = signal(false);
  showLogoutConfirm = signal(false);
  showSubjects = signal(true);
  
  // Notifications
  unreadCount = signal(0);
  hasUnread = computed(() => this.unreadCount() > 0);
  recentAnnouncements = signal<any[]>([]);
  private lastCheckedId = 0;
  private sub = new Subscription();

  enrollment = signal<ClassSection[]>([]);
  loadingSections = signal(true);

  userInitials = computed(() => {
    const u = this.auth.user();
    if (!u) return 'ST';
    return `${ u.firstName[0] }${ u.lastName[0] }`.toUpperCase();
  });

  constructor() {
    this.bp.observe([Breakpoints.Handset]).subscribe(r => this.isMobile.set(r.matches));
  }

  ngOnInit(): void {
    this.loadEnrollments();
    this.refreshAnnouncements();

    // Listen for real-time updates from central notification service (Cross-tab)
    this.sub.add(this.api.refresh$.subscribe(source => {
      if (source?.includes('announcements') || source?.includes('enrollments') || source === 'general') {
        this.refreshAnnouncements();
        this.loadEnrollments();
      }
    }));

    // Poll every 30 seconds for real-time updates across users
    this.sub.add(timer(30000, 30000).subscribe(() => {
      this.refreshAnnouncements();
    }));
  }


  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  refreshAnnouncements(): void {
    const savedLastId = localStorage.getItem('last_notif_id');
    if (savedLastId) this.lastCheckedId = parseInt(savedLastId);

    this.api.getMyAnnouncements().subscribe(r => {
      const announcements = r.data || [];
      announcements.sort((a: any, b: any) => b.id - a.id);
      this.recentAnnouncements.set(announcements.slice(0, 5));
      
      const newUnread = announcements.filter((a: any) => a.id > this.lastCheckedId).length;
      this.unreadCount.set(newUnread);
    });
  }


  // redundant sound logic removed, handled by RealtimeNotificationService


  markAsRead(): void {
    const latest = this.recentAnnouncements()[0];
    if (latest) {
      this.lastCheckedId = latest.id;
      localStorage.setItem('last_notif_id', this.lastCheckedId.toString());
      this.unreadCount.set(0);
    }
  }

  navigateToSubject(id: number | null): void {
    this.markAsRead();
    if (id) {
       this.router.navigate(['/student/subjects', id], { queryParams: { tab: 'updates' } });
    } else {
       this.router.navigate(['/student/notifications']);
    }
  }

  loadEnrollments(): void {
    this.api.getMyEnrollments().subscribe({
      next: r => { 
        // Only show completely active enrollments in the sidebar
        const activeOnly = (r.data || []).filter((x: any) => x.enrollmentStatus === 'active');
        this.enrollment.set(activeOnly); 
        this.loadingSections.set(false); 
      },
      error: () => this.loadingSections.set(false)
    });
  }

  isRedundant(s: any): boolean {
    if (!s.sectionName || !s.courseCode) return true;
    const n1 = s.courseCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = s.sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return n1 === n2;
  }

  onRouteActivate(): void {
    if (this.mainContent?.nativeElement) {
      this.mainContent.nativeElement.scrollTop = 0;
    }
    // Also scroll the parentsidenav-content if it's the one actually scrolling
    const scrollContainer = document.querySelector('.main-content');
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }

  getAvatarColor(code: string): string {
    const colors = [
      '#EA4335', // Red
      '#FBBC05', // Yellow
      '#34A853', // Green
      '#673AB7', // Purple
      '#00ACC1', // Cyan
      '#FF6D00', // Orange
    ];
    let hash = 0;
    HashLoop: for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }
}
