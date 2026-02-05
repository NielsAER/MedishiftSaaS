import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-white flex flex-col">
      <header className="h-16 flex justify-between items-center px-4 py-4 md:px-6 border-b border-border bg-background/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-medical-blue rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Medishift
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="font-medium text-[15px]">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="font-medium text-[15px] h-10 rounded-lg">
              Get started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <div className="w-full max-w-md mx-auto">
          <Card className="border-border shadow-lg">
            <CardContent className="pt-8 pb-8 px-6 md:px-8">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2 text-center">
                Medishift
              </h1>
              <p className="text-[15px] text-muted-foreground mb-8 text-center leading-relaxed">
                Timesheets. Simplified.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-medical-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-muted-foreground leading-relaxed">
                    Reduce timesheet management from hours to under one.
                  </span>
                </li>
                <li className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-medical-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-muted-foreground leading-relaxed">
                    Automated shift codes and conflict detection.
                  </span>
                </li>
                <li className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 bg-medical-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-medical-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-muted-foreground leading-relaxed">
                    Interactive scheduling grids for healthcare teams.
                  </span>
                </li>
              </ul>

              <div className="flex flex-col gap-3">
                <Link href="/register">
                  <Button
                    className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    data-testid="button-get-started"
                  >
                    Get started
                  </Button>
                </Link>
                <p className="text-[13px] text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>

              <p className="text-[13px] text-muted-foreground mt-6 text-center">
                Built for hospitals, elderly care homes, and medical facilities.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
