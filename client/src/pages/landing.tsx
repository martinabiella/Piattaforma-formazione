import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { 
  GraduationCap, 
  BookOpen, 
  Trophy, 
  BarChart3, 
  ArrowRight,
  CheckCircle2 
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Interactive Modules",
    description: "Engage with rich content including text, images, and multimedia learning materials.",
  },
  {
    icon: Trophy,
    title: "Quizzes & Assessments",
    description: "Test your knowledge with interactive quizzes at the end of each module.",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    description: "Monitor your learning journey with detailed progress tracking and analytics.",
  },
];

const benefits = [
  "Self-paced learning at your convenience",
  "Professional certification upon completion",
  "Access on any device, anywhere",
  "Expert-curated content",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="relative max-w-7xl mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <GraduationCap className="h-4 w-4" />
                <span>Professional Online Training</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
                Master New Skills with{" "}
                <span className="text-primary">Interactive Learning</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
                Access comprehensive training modules, complete assessments, and track your progress. 
                Start your learning journey today.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto" data-testid="button-get-started">
                  <a href="/api/login" className="flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-card">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" data-testid="text-features-title">
                Everything You Need to Learn
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our platform provides all the tools and resources you need for effective learning.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6" data-testid="text-benefits-title">
                  Why Choose Our Platform?
                </h2>
                <p className="text-muted-foreground mb-8">
                  We've designed our learning platform with your success in mind. 
                  Whether you're upskilling for your career or exploring new interests, 
                  we've got you covered.
                </p>
                
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3" data-testid={`text-benefit-${index}`}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
                  <GraduationCap className="h-32 w-32 text-primary/40" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">
              Ready to Start Learning?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of learners who have transformed their careers with our training modules.
            </p>
            <Button 
              variant="secondary" 
              size="lg" 
              asChild
              data-testid="button-cta"
            >
              <a href="/api/login" className="flex items-center gap-2">
                Start Your Journey
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">LearnHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} LearnHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
