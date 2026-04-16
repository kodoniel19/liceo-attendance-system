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
             <div>
               <h3 *ngIf="selectedStudent()">{{ selectedStudent()?.firstName }} {{ selectedStudent()?.lastName }}</h3>
               <p>Complete Attendance History across all subjects</p>
             </div>
             <button mat-icon-button (click)="closeHistoryModal()"><mat-icon>close</mat-icon></button>
           </div>
           
           <div class="modal-body">
              <div *ngIf="historyLoading()" class="loading-state" style="padding: 40px 0;">
                <mat-spinner diameter="36"></mat-spinner>
              </div>
              
              <table class="risk-table" *ngIf="!historyLoading() && attendanceHistory().length > 0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Course Code</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let record of attendanceHistory()">
                    <td style="font-size: 0.8rem; font-weight: 500;">{{ record.sessionDate | date:'mediumDate' }}</td>
                    <td style="font-weight: 600;">{{ record.courseCode }}</td>
                    <td>
                      <span class="status-token" [ngClass]="record.status">{{ record.status }}</span>
                    </td>
                    <td style="font-size: 0.8rem; color: #64748b;">{{ record.remarks || '—' }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="empty-state" *ngIf="!historyLoading() && attendanceHistory().length === 0" style="padding: 40px 0;">
                 <div class="empty-icon">📝</div>
                 <h3>No Records Found</h3>
                 <p>This student does not have any recorded attendance yet.</p>
              </div>
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

    .empty-state { text-align: center; padding: 80px 40px; color: #94a3b8; .empty-icon { font-size: 48px; margin-bottom: 16px; } h3 { color: #1e293b; margin-bottom: 8px; } }

    /* Modal CSS */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
    .history-modal { background: white; border-radius: 20px; width: 100%; max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; }
    .modal-header  { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 24px 20px; border-bottom: 1px solid #f1f5f9; h3 { font-size: 1.25rem; font-weight: 800; color: #1a1a2e; margin: 0 0 4px; } p { margin: 0; font-size: 0.85rem; color: #64748b; } }
    .modal-body    { overflow-y: auto; flex: 1; display: flex; flex-direction: column; }
    
    .status-token { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-token.present { background: #d1fae5; color: #065f46; }
    .status-token.late    { background: #fef3c7; color: #92400e; }
    .status-token.absent  { background: #fee2e2; color: #991b1b; }
    .status-token.excused { background: #f1f5f9; color: #475569; }
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
