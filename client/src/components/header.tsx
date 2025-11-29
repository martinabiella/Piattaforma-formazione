import { Link } from "wouter";
import { GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl hidden sm:inline-block">LearnHub</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!isLoading && (
            isAuthenticated ? (
              <UserMenu />
            ) : (
              <Button asChild data-testid="button-login">
                <a href="/api/login">Log in</a>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
