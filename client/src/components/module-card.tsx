import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { BookOpen, ArrowRight } from "lucide-react";
import type { ModuleWithProgress } from "@shared/schema";

interface ModuleCardProps {
  module: ModuleWithProgress;
}

export function ModuleCard({ module }: ModuleCardProps) {
  const progressValue = module.status === "completed" ? 100 : module.status === "in_progress" ? 50 : 0;

  return (
    <Card className="overflow-hidden hover-elevate flex flex-col h-full" data-testid={`card-module-${module.id}`}>
      <div className="aspect-video bg-muted relative overflow-hidden">
        {module.imageUrl ? (
          <img 
            src={module.imageUrl} 
            alt={module.title} 
            className="w-full h-full object-cover"
            data-testid={`img-module-${module.id}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={module.status} />
        </div>
      </div>
      
      <CardHeader className="flex-none pb-2">
        <h3 className="font-semibold text-lg line-clamp-2" data-testid={`text-module-title-${module.id}`}>
          {module.title}
        </h3>
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-module-description-${module.id}`}>
          {module.description || "No description available"}
        </p>
      </CardContent>
      
      <CardFooter className="flex-none pt-4 border-t flex flex-col gap-4">
        <div className="w-full space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" data-testid={`progress-module-${module.id}`} />
        </div>
        
        <Button asChild className="w-full" data-testid={`button-module-${module.id}`}>
          <Link href={`/app/modules/${module.id}`} className="flex items-center gap-2">
            {module.status === "not_started" ? "Start Module" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
