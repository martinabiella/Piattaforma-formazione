import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <Card className="p-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <span className="text-4xl font-bold text-muted-foreground">404</span>
            </div>
            
            <h1 className="text-2xl font-bold mb-2" data-testid="text-404-title">
              Page Not Found
            </h1>
            
            <p className="text-muted-foreground mb-8" data-testid="text-404-description">
              The page you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" asChild data-testid="button-go-back">
                <a href="javascript:history.back()" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </a>
              </Button>
              <Button asChild data-testid="button-go-home">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
