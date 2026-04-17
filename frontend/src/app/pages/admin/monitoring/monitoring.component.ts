import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-monitoring',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="admin-page animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1>At-Risk Monitoring</h1>
          <p>Identifying students with low attendance thresholds across all courses</p>
        </div>
        <button mat-raised-button color="primary" (click)="load()">
          <mat-icon>refresh</mat-icon> Refresh Data
        </button>
      </div>

      <div *ngIf="loading()" class="loading-state">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Analyzing attendance patterns...</p>
      </div>

      <div class="monitoring-container" *ngIf="!loading()">
        
        <!-- Threshold Alert -->
        <div class="alert-card info">
           <mat-icon>info</mat-icon>
           <div class="alert-text">
              <strong>Institutional Policy:</strong> Showing students with an overall attendance rate below <strong>75%</strong>.
           </div>
        </div>

        <!-- Risk List -->
        <div class="table-card" *ngIf="students().length > 0">
           <table class="risk-table">
              <thead>
                 <tr>
                    <th>Student Details</th>
                    <th>Average Rate</th>
                    <th>Subjects Enrolled</th>
                    <th>Risk Level</th>
                 </tr>
              </thead>
              <tbody>
                 <tr *ngFor="let s of students()">
                    <td>
                       <div class="student-info">
                          <div class="student-avatar">{{ s.lastName?.[0] }}{{ s.firstName?.[0] }}</div>
                          <div>
                             <div class="student-name">{{ s.lastName }}, {{ s.firstName }}</div>
                             <div class="student-id">{{ s.universityId }}</div>
                          </div>
                       </div>
                    </td>
                    <td>
                       <div class="rate-column">
                          <div class="rate-value">{{ s.overallRate | number:'1.0-1' }}%</div>
                          <div class="rate-bar-bg">
                             <div class="rate-bar-fill" [style.width.%]="s.overallRate" 
                                  [class.bg-danger]="s.overallRate < 50"
                                  [class.bg-warning]="s.overallRate >= 50"></div>
                          </div>
                       </div>
                    </td>
                    <td>
                       <span class="subject-count">{{ s.totalSubjects }} Subjects</span>
                    </td>
                    <td>
                       <span class="risk-badge" [class.risk-high]="s.overallRate < 50" [class.risk-med]="s.overallRate >= 50">
                          {{ s.overallRate < 50 ? 'Critical' : 'Moderate' }} Risk
                       </span>
                    </td>
                 </tr>
              </tbody>
           </table>
        </div>

        <div class="empty-state" *ngIf="students().length === 0">
           <div class="empty-icon">🛡️</div>
           <h3>No Students At Risk</h3>
           <p>All students are maintaining attendance above institutional thresholds.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { padding: 0; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;
      h1 { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin: 0 0 4px; }
      p { color: #64748b; font-size: 0.875rem; margin: 0; }
    }

    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #64748b; font-weight: 500; p { margin-top: 16px; } }

    .alert-card {
      display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;
      &.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .alert-text { font-size: 0.9rem; }
    }

    .table-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden; }
    .risk-table { width: 100%; border-collapse: collapse; }
    .risk-table th { background: #f8fafc; padding: 14px 20px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .risk-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .risk-table tr:hover td { background: #fbcfdc22; }

    .student-info { display: flex; align-items: center; gap: 12px; }
    .student-avatar { width: 36px; height: 36px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
    .student-name { font-weight: 600; color: #1e293b; font-size: 0.9rem; }
    .student-id { font-size: 0.75rem; color: #64748b; font-family: monospace; }

    .rate-column { width: 140px; }
    .rate-value { font-weight: 700; font-size: 1rem; color: #1e293b; margin-bottom: 4px; }
    .rate-bar-bg { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .rate-bar-fill { height: 100%; border-radius: 3px; }
    .bg-danger { background: #ef4444; }
    .bg-warning { background: #f59e0b; }

    .subject-count { font-size: 0.85rem; font-weight: 500; color: #475569; }

    .risk-badge { font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
    .risk-high { background: #fee2e2; color: #991b1b; }
    .risk-med { background: #fef3c7; color: #92400e; }

    .view-btn { background-color: #f1f5f9 !important; color: #1e293b !important; font-weight: 600 !important; font-size: 0.8rem !important; }

    .empty-state { text-align: center; padding: 80px 40px; color: #94a3b8; .empty-icon { font-size: 48px; margin-bottom: 16px; } h3 { color: #1e293b; margin-bottom: 20px; } }

    /* Balanced Professional Modal */
    .modal-overlay { 
      position: fixed; inset: 0; 
      background: rgba(15, 23, 42, 0.4); 
      z-index: 2000; 
      backdrop-filter: blur(12px); 
      overflow-y: auto;
      display: flex; flex-direction: column; padding: 40px 20px;
    }
    .history-modal { 
      background: white; border-radius: 28px; width: 100%; max-width: 680px; 
      min-height: 480px; margin: auto;
      display: flex; flex-direction: column; 
      box-shadow: 0 40px 120px -20px rgba(0,0,0,0.4); 
      overflow: hidden; border: none;
      animation: modalPopSoft 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; flex-shrink: 0;
    }
    @keyframes modalPopSoft {
      from { transform: scale(0.96) translateY(20px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    .modal-header { 
      padding: 16px 24px; border-bottom: 1px solid #f1f5f9; 
      display: flex; justify-content: space-between; align-items: center; 
      background: #ffffff; flex-shrink: 0;
    }
    .header-content { display: flex; align-items: center; gap: 16px; }
    
    .avatar-large { width: 64px; height: 64px; border-radius: 16px; background: #8b1a1a; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; box-shadow: 0 8px 20px -4px rgba(139, 26, 26, 0.3); flex-shrink: 0; }
    
    .profile-details h3 { font-size: 1.5rem; font-weight: 950; color: #0f172a; margin: 0 0 4px; letter-spacing: -1px; line-height: 1.2; }
    .university-pill { display: inline-flex; padding: 4px 12px; background: #f1f5f9; border-radius: 8px; font-size: 0.8rem; font-weight: 800; color: #64748b; font-family: monospace; border: 1px solid #e2e8f0; margin-bottom: 8px; }
    
    .attendance-avg-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: rgba(139, 26, 26, 0.05); color: #8b1a1a; border-radius: 10px; font-size: 0.85rem; font-weight: 850; border: 1px solid rgba(139, 26, 26, 0.1); 
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .close-btn { background-color: #f1f5f9 !important; color: #64748b !important; border-radius: 14px !important; width: 44px !important; height: 44px !important; &:hover { background-color: #e2e8f0 !important; color: #0f172a !important; } }

    .modal-body { flex: 1; overflow-y: auto; padding: 0; background: #ffffff; }
    .loading-state-modal { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; color: #64748b; font-weight: 500; p { margin-top: 24px; } }

    .history-premium-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .history-premium-table th { position: sticky; top: 0; background: #f8fafc; z-index: 10; padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .history-premium-table td { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .history-premium-table tr:last-child td { border-bottom: none; }
    .history-premium-table tr:hover td { background: #f8fafc; }

    .cell-date { width: 160px; }
    .date-primary { font-weight: 700; color: #334155; font-size: 0.9rem; }
    .date-secondary { font-size: 0.75rem; color: #94a3b8; font-weight: 500; margin-top: 2px; }

    .cell-subject { min-width: 250px; }
    .subject-name { font-weight: 700; color: #0f172a; font-size: 0.95rem; margin-bottom: 4px; line-height: 1.3; }
    .subject-meta { font-size: 0.75rem; color: #64748b; font-weight: 600; }

    .status-chip { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 10px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-chip.present { background: #ecfdf5; color: #059669; }
    .status-chip.late    { background: #fffbeb; color: #d97706; }
    .status-chip.absent  { background: #fef2f2; color: #dc2626; }
    .status-chip.excused { background: #f8fafc; color: #475569; }

    .cell-remarks { max-width: 200px; }
    .remark-text { font-size: 0.8rem; color: #64748b; line-height: 1.5; font-style: italic; }

    .empty-notif { padding: 60px 24px; text-align: center; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .empty-illu { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
    .empty-notif h4 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 0 8px; }
    .empty-notif p { color: #64748b; font-size: 0.9rem; margin: 0; }

    .modal-footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }
    .close-btn { color: #94a3b8; }

    @media (max-width: 600px) {
      .history-modal { width: 96%; border-radius: 20px; }
      .modal-header { padding: 16px 20px; }
      .avatar-large { width: 56px; height: 56px; font-size: 1.2rem; border-radius: 12px; }
      .profile-details h3 { font-size: 1.1rem; }
      .header-content { gap: 12px; }
      .history-premium-table th, .history-premium-table td { padding: 12px 16px; }
      .cell-date { width: 100px; }
      .date-primary { font-size: 0.8rem; }
      .subject-name { font-size: 0.85rem; }
    }
  `]
})
export class AdminMonitoringComponent implements OnInit {
  api = inject(ApiService);
  students = signal<any[]>([]);
  loading = signal(true);
  
  // History Modal
  showHistoryModal = signal(false);
  selectedStudent = signal<any>(null);
  historyLoading = signal(false);
  attendanceHistory = signal<any[]>([]);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAtRiskStudents().subscribe({
      next: r => { this.students.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  viewRecord(student: any): void {
    this.selectedStudent.set(student);
    this.showHistoryModal.set(true);
    this.historyLoading.set(true);
    
    this.api.getStudentAttendanceHistoryByAdmin(student.id).subscribe({
      next: r => {
        this.attendanceHistory.set(r.data || []);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false)
    });
  }
  
  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.selectedStudent.set(null);
    this.attendanceHistory.set([]);
  }
}
