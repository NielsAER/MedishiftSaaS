interface StatsCardsProps {
  stats?: {
    totalStaff: number;
    totalHours: number;
    overtimeHours: number;
    conflicts: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Staff</p>
            <p className="text-2xl font-bold text-foreground" data-testid="stat-total-staff">
              {stats?.totalStaff || 0}
            </p>
          </div>
          <div className="w-10 h-10 bg-medical-blue/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-users text-medical-blue"></i>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Hours</p>
            <p className="text-2xl font-bold text-foreground" data-testid="stat-total-hours">
              {stats?.totalHours || 0}
            </p>
          </div>
          <div className="w-10 h-10 bg-medical-green/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-clock text-medical-green"></i>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overtime Hours</p>
            <p className="text-2xl font-bold text-orange-600" data-testid="stat-overtime-hours">
              {stats?.overtimeHours || 0}
            </p>
          </div>
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-orange-600"></i>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Conflicts</p>
            <p className="text-2xl font-bold text-red-600" data-testid="stat-conflicts">
              {stats?.conflicts || 0}
            </p>
          </div>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <i className="fas fa-times-circle text-red-600"></i>
          </div>
        </div>
      </div>
    </div>
  );
}
