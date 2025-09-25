import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-white flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <Card className="border-border shadow-lg">
          <CardContent className="pt-8 pb-8 px-8 text-center">
            <div className="w-16 h-16 bg-medical-blue rounded-lg flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-hospital-symbol text-white text-2xl"></i>
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">Medishift</h1>
            <p className="text-muted-foreground mb-8">Timesheets. Simplified.</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-check text-medical-green text-sm"></i>
                </div>
                <span className="text-sm text-muted-foreground">Reduce timesheet management from 3 hours to under 1 hour</span>
              </div>
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-check text-medical-green text-sm"></i>
                </div>
                <span className="text-sm text-muted-foreground">Automated shift code handling and conflict detection</span>
              </div>
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-check text-medical-green text-sm"></i>
                </div>
                <span className="text-sm text-muted-foreground">Interactive scheduling grids for healthcare teams</span>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-login"
            >
              Get Started
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Built for hospitals, elderly care homes, and medical facilities
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
