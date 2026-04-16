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
                    <th>Actions</th>
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
                    <td>
                       <button mat-flat-button class="view-btn" (click)="viewRecord(s)">
                          View Record
                       </button>
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

      <!-- History Modal -->
      <div class="modal-overlay" *ngIf="showHistoryModal()">
        <div class="history-modal animate-fade-in-up">
           <div class="modal-header">
             <div class="header-content">
               <div class="avatar-large">{{ selectedStudent()?.lastName?.[0] || '?' }}{{ selectedStudent()?.firstName?.[0] || '' }}</div>
               <div class="profile-details">
                 <div class="university-pill">{{ selectedStudent()?.universityId || 'ID UNKNOWN' }}</div>
                 <h3>{{ selectedStudent()?.firstName }} {{ selectedStudent()?.lastName }}</h3>
                 <span class="attendance-avg-badge">
                   <mat-icon>analytics</mat-icon>
                   Overall: {{ selectedStudent()?.overallRate | number:'1.0-1' }}%
                 </span>
               </div>
             </div>
             <button mat-icon-button (click)="closeHistoryModal()" class="close-btn" title="Close">
               <mat-icon>close</mat-icon>
             </button>
           </div>
           
           <div class="modal-body">
              <div *ngIf="historyLoading()" class="loading-state-modal">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Retrieving academic records...</p>
              </div>
              
              <div *ngIf="!historyLoading() && attendanceHistory().length > 0" class="history-list-container">
                <div class="history-table-wrapper">
                  <table class="history-premium-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Subject & Section</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let record of attendanceHistory()">
                        <td class="cell-date">
                          <div class="date-primary">{{ record.sessionDate | date:'MMM dd, yyyy' }}</div>
                          <div class="date-secondary">{{ record.sessionDate | date:'shortTime' }}</div>
                        </td>
                        <td class="cell-subject">
                          <div class="subject-name">{{ record.courseName }}</div>
                          <div class="subject-meta">{{ record.courseCode }} • {{ record.sectionName }}</div>
                        </td>
                        <td class="cell-status">
                          <span class="status-chip" [ngClass]="record.status">{{ record.status }}</span>
                        </td>
                        <td class="cell-remarks">
                          <span class="remark-text">{{ record.remarks || 'No remarks recorded' }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="empty-notif" *ngIf="!historyLoading() && attendanceHistory().length === 0">
                 <div class="empty-illu">📋</div>
                 <h4>Zero Records Found</h4>
                 <p>This student hasn't logged any attendance sessions yet.</p>
              </div>
           </div>
           
           <div class="modal-footer">
             <button mat-button (click)="closeHistoryModal()">Dismiss</button>
           </div>
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

    /* Optimized Modal Layout */
    .modal-overlay { 
      position: fixed; inset: 0; 
      background: rgba(255, 255, 255, 0.5); 
      display: flex; justify-content: center; align-items: flex-start; 
      z-index: 1000; padding: 6vh 20px; 
      backdrop-filter: blur(20px); 
      overflow-y: auto;
    }
    .history-modal { 
      background: white; border-radius: 32px; width: 100%; max-width: 850px; 
      min-height: 400px;
      display: flex; flex-direction: column; 
      box-shadow: 0 30px 100px -20px rgba(0,0,0,0.2); 
      overflow: hidden;
      animation: modalSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalSlide {
      from { transform: translateY(20px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    .modal-header { 
      padding: 32px 40px; border-bottom: 1px solid #f1f5f9; 
      display: flex; justify-content: space-between; align-items: center; 
      background: #ffffff; flex-shrink: 0;
    }
    .header-content { display: flex; align-items: center; gap: 28px; }
    
    .avatar-large { width: 88px; height: 88px; border-radius: 24px; background: #8b1a1a; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; box-shadow: 0 15px 30px -10px rgba(139, 26, 26, 0.4); flex-shrink: 0; }
    
    .profile-details h3 { font-size: 1.8rem; font-weight: 900; color: #0f172a; margin: 0 0 6px; letter-spacing: -1px; }
    .university-pill { display: inline-flex; padding: 4px 12px; background: #f8fafc; border-radius: 8px; font-size: 0.8rem; font-weight: 700; color: #64748b; font-family: monospace; border: 1px solid #e2e8f0; margin-bottom: 8px; }
    
    .attendance-avg-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(139, 26, 26, 0.04); color: #8b1a1a; border-radius: 12px; font-size: 0.85rem; font-weight: 800; border: 1px solid rgba(139, 26, 26, 0.08); 
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .close-btn { background-color: #f1f5f9 !important; color: #64748b !important; border-radius: 14px !important; width: 44px !important; height: 44px !important; &:hover { background-color: #e2e8f0 !important; color: #0f172a !important; } }

    .modal-body { flex: 1; overflow-y: auto; padding: 0; background: #ffffff; min-height: 200px; }
    .loading-state-modal { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; color: #64748b; font-weight: 500; p { margin-top: 20px; } }

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

    .empty-notif { padding: 80px 40px; text-align: center; }
    .empty-illu { font-size: 3rem; margin-bottom: 20px; opacity: 0.5; }
    .empty-notif h4 { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
    .empty-notif p { color: #64748b; font-size: 0.9rem; }

    .modal-footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; }
    .close-btn { color: #94a3b8; }
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
