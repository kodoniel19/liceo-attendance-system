import { Component, signal, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="admin-shell">
      <!-- Sidebar -->
      <aside class="admin-sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-brand">
          <div class="sidebar-logo">🎓</div>
          <div class="sidebar-brand-text" *ngIf="!sidebarCollapsed()">
            <div class="brand-name">Liceo</div>
            <div class="brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a routerLink="/admin/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-link">
            <span class="material-icons">dashboard</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Dashboard</span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-link">
            <span class="material-icons">people</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Users</span>
          </a>
          <a routerLink="/admin/courses" routerLinkActive="active" class="nav-link">
            <span class="material-icons">school</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Courses</span>
          </a>
          <a routerLink="/admin/sections" routerLinkActive="active" class="nav-link">
            <span class="material-icons">class</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Sections</span>
          </a>
          
          <div class="nav-divider"></div>
          <div class="nav-group-label" *ngIf="!sidebarCollapsed()">Institutional</div>
          <a routerLink="/admin/monitoring" routerLinkActive="active" class="nav-link">
            <span class="material-icons text-danger">warning</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">At-Risk Monitoring</span>
          </a>
          <a routerLink="/admin/broadcast" routerLinkActive="active" class="nav-link">
            <span class="material-icons text-info">campaign</span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">System Broadcast</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user" *ngIf="!sidebarCollapsed()">
            <div class="user-avatar">{{ auth.user()?.firstName?.[0] }}{{ auth.user()?.lastName?.[0] }}</div>
            <div>
              <div class="user-name">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</div>
              <div class="user-role">Administrator</div>
            </div>
          </div>
          <button class="logout-btn" (click)="showLogoutConfirm.set(true)" [class.icon-only]="sidebarCollapsed()">
            <span class="material-icons">logout</span>
            <span *ngIf="!sidebarCollapsed()">Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Logout Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showLogoutConfirm()" (click)="showLogoutConfirm.set(false)">
        <div class="logout-modal animate-fade-in-up" (click)="$event.stopPropagation()">
          <div class="logout-modal__header">
            <div class="logout-icon-wrapper">
              <mat-icon>logout</mat-icon>
            </div>
            <h3>Sign Out?</h3>
            <p>Are you sure you want to log out of the admin panel?</p>
          </div>
          <div class="logout-modal__footer">
            <button class="btn-cancel" (click)="showLogoutConfirm.set(false)">Cancel</button>
            <button class="btn-logout" (click)="auth.logout()">Sign Out</button>
          </div>
        </div>
      </div>

      <!-- Main content -->
      <main class="admin-main">
        <div class="admin-topbar">
          <div class="topbar-left">
            <span class="topbar-greeting">Admin Control Panel</span>
          </div>
          <div class="topbar-right">
            <div class="topbar-badge admin-badge">ADMIN</div>
          </div>
        </div>
        <div class="admin-content">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell { display: flex; height: 100vh; overflow: hidden; background: #f0f2f5; }

    /* Sidebar */
    .admin-sidebar {
      width: 260px; height: 100vh;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex; flex-direction: column;
      transition: width 0.3s ease;
      flex-shrink: 0; position: sticky; top: 0;
    }
    .admin-sidebar.collapsed { width: 72px; }

    .sidebar-brand {
      display: flex; align-items: center; padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      gap: 10px; min-height: 70px;
    }
    .sidebar-logo { font-size: 28px; flex-shrink: 0; }
    .sidebar-brand-text { flex: 1; }
    .brand-name { font-size: 1rem; font-weight: 800; color: #e94560; letter-spacing: 0.05em; }
    .brand-sub { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; }
    .sidebar-toggle {
      background: transparent; border: none; cursor: pointer;
      color: rgba(255,255,255,0.5); margin-left: auto; padding: 4px;
      border-radius: 6px; display: flex; align-items: center;
      transition: all 0.2s;
      &:hover { background: rgba(255,255,255,0.1); color: white; }
      .material-icons { font-size: 20px; }
    }

    .sidebar-nav {
      flex: 1; padding: 16px 12px;
      display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
    }
    .nav-link {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      color: rgba(255,255,255,0.55);
      text-decoration: none; font-size: 0.875rem; font-weight: 500;
      transition: all 0.2s; white-space: nowrap;
      .material-icons { font-size: 20px; flex-shrink: 0; }
      &:hover { background: rgba(255,255,255,0.08); color: #fff; }
      &.active { background: rgba(233,69,96,0.2); color: #e94560; font-weight: 700; }
    }
    .nav-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
    .nav-group-label { font-size: 0.65rem; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.12em; padding: 12px 14px 4px; font-weight: 700; }
    .nav-label { overflow: hidden; }
    
    .text-danger  { color: #ef4444 !important; }
    .text-info    { color: #6366f1 !important; }
    .text-warning { color: #f59e0b !important; }

    .sidebar-footer {
      padding: 16px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; flex-direction: column; gap: 12px;
    }
    .sidebar-user { display: flex; align-items: center; gap: 10px; }
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
      &.icon-only { justify-content: center; padding: 10px; }
    }

    /* Main */
    .admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .admin-topbar {
      height: 60px; background: white; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      position: sticky; top: 0; z-index: 10;
    }
    .topbar-greeting { font-size: 0.9rem; font-weight: 600; color: #2d3748; }
    .admin-badge {
      background: linear-gradient(135deg, #e94560, #c23152);
      color: white; padding: 4px 14px; border-radius: 20px;
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em;
    }
    .admin-content { padding: 24px; flex: 1; overflow-y: auto; }

    @media (max-width: 768px) {
      .admin-sidebar { width: 72px; }
      .sidebar-brand-text, .nav-label, .sidebar-user, .logout-btn span:last-child { display: none; }
      .logout-btn { justify-content: center; }
    }

    /* Logout Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .logout-modal {
      background: white; border-radius: 20px; width: 100%; max-width: 320px;
      padding: 32px 24px; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
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
    .btn-logout { background: #e94560; color: white; border: none; padding: 12px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; &:hover { background: #c23152; } }
    .btn-cancel { background: #f1f5f9; color: #475569; border: none; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; &:hover { background: #e2e8f0; } }
  `]
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);
  sidebarCollapsed = signal(false);
  showLogoutConfirm = signal(false);

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  @HostListener('window:keydown.escape')
  onEscape(): void { this.sidebarCollapsed.set(true); }
}
