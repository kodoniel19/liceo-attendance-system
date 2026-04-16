import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-broadcast',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-page animate-fade-in-up">
      <div class="page-header">
        <h1>System-Wide Broadcast</h1>
        <p>Send urgent announcements to all students and instructors instantly</p>
      </div>

      <div class="broadcast-container">
        <!-- Warning Info -->
        <div class="broadcast-warning">
           <mat-icon>report_problem</mat-icon>
           <div class="warning-text">
              <strong>High Visibility Action:</strong> Broadcasts are sent to every user in the university. 
              Please ensure the content is accurate and university-related.
           </div>
        </div>

        <div class="broadcast-card-main">
           <div class="card-header-icon">
              <mat-icon>campaign</mat-icon>
           </div>
           
           <form (submit)="send()" class="broadcast-form">
              <div class="form-group">
                 <label>Announcement Title</label>
                 <input type="text" name="title" [(ngModel)]="title" 
                        placeholder="e.g. Schedule Change, Campus Event, System Maintenance..." required>
              </div>

              <div class="form-group">
                 <label>Message Content</label>
                 <textarea name="content" [(ngModel)]="content" 
                           placeholder="Type your announcement detail here..." rows="8" required></textarea>
                 <span class="char-count">{{ content.length }} characters</span>
              </div>

              <div class="form-group">
                 <label>Target Audience</label>
                 <div class="target-options">
                   <label class="target-option">
                     <input type="radio" name="targetRole" [(ngModel)]="targetRole" value="all">
                     <span>All Users</span>
                   </label>
                   <label class="target-option">
                     <input type="radio" name="targetRole" [(ngModel)]="targetRole" value="student">
                     <span>Students Only</span>
                   </label>
                   <label class="target-option">
                     <input type="radio" name="targetRole" [(ngModel)]="targetRole" value="instructor">
                     <span>Instructors Only</span>
                   </label>
                 </div>
              </div>

              <div class="form-actions">
                 <button type="button" mat-button (click)="reset()">Clear Form</button>
                 <button type="submit" mat-raised-button color="primary" 
                         [disabled]="sending() || !title || !content">
                    <mat-icon *ngIf="!sending()">send</mat-icon>
                    <mat-spinner diameter="18" *ngIf="sending()"></mat-spinner>
                    <span>{{ sending() ? 'Broadcasting...' : 'Broadcast to University' }}</span>
                 </button>
              </div>
           </form>
        </div>

        <!-- Future: Broadcast History could go here -->
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 0; max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 32px;
      h1 { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin: 0 0 4px; }
      p { color: #64748b; font-size: 0.875rem; margin: 0; }
    }

    .broadcast-container { display: flex; flex-direction: column; gap: 24px; }

    .broadcast-warning {
       display: flex; gap: 16px; padding: 20px; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; color: #9a3412;
       mat-icon { font-size: 24px; width: 24px; height: 24px; }
       .warning-text { font-size: 0.9rem; line-height: 1.5; }
    }

    .broadcast-card-main {
        background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); padding: 40px;
        position: relative; overflow: hidden;
        width: 100%;
        @media (max-width: 600px) { padding: 24px; }
    }
    .card-header-icon {
       position: absolute; top: -10px; right: -10px; opacity: 0.05;
       mat-icon { font-size: 150px; width: 150px; height: 150px; color: #6366f1; }
    }

    .broadcast-form { display: flex; flex-direction: column; gap: 24px; position: relative; z-index: 1; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 0.85rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

    .form-group input, .form-group textarea {
       width: 100%; padding: 14px 18px; border: 2px solid #e2e8f0; border-radius: 12px;
       font-size: 1rem; font-family: inherit; transition: all 0.2s;
       &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
    }
    .char-count { align-self: flex-end; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

    .form-actions { 
       display: flex; justify-content: flex-end; gap: 16px; margin-top: 12px;
       @media (max-width: 480px) { flex-direction: column; align-items: stretch; }
    }
    .form-actions button[mat-raised-button] { padding: 0 32px; height: 48px; border-radius: 24px; font-weight: 700; letter-spacing: 0.02em; }

    .target-options { 
       display: flex; gap: 24px; margin-top: 8px; flex-wrap: wrap; 
       @media (max-width: 600px) { flex-direction: column; gap: 12px; }
    }
    .target-option { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.9rem; color: #475569; font-weight: 600; }
    .target-option input { width: 18px; height: 18px; cursor: pointer; border: 2px solid #cbd5e1; transition: all 0.2s; }
  `]
})
export class AdminBroadcastComponent {
  api = inject(ApiService);
  toast = inject(ToastService);

  title = '';
  content = '';
  targetRole = 'all';
  sending = signal(false);

  send(): void {
    if (!this.title || !this.content) return;
    this.sending.set(true);
    this.api.sendGlobalBroadcast(this.title, this.content, this.targetRole).subscribe({
      next: () => {
        this.toast.success('System broadcast sent!');
        this.sending.set(false);
        this.reset();
      },
      error: (e) => {
        this.toast.error(e.error?.message || 'Failed to send broadcast');
        this.sending.set(false);
      }
    });
  }

  reset(): void {
    this.title = '';
    this.content = '';
    this.targetRole = 'all';
  }
}
