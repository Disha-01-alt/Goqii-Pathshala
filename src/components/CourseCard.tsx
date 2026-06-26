import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, MoreVertical, Trash2, Edit, Play, Eye, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Course } from "@/hooks/useCourseLibrary";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

interface CourseCardProps {
  course: Course;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  showActions?: boolean;
}

export function CourseCard({ course, onDelete, onEdit, showActions = true }: CourseCardProps) {
  const navigate = useNavigate();
  const { isManager, isLearner, loading: roleLoading } = useUserRole();
  const moduleCount = course.course_modules?.length || 0;
  const assignmentCount = course.totalAssignmentCount || 0;

  // Hard guard: managers + learners should never see edit/delete actions.
  // Also prevents a brief "flash" of actions while role is loading.
  const canShowActions = showActions && !roleLoading && !isManager && !isLearner;

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 bg-card">
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <BookOpen className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={course.is_published ? "default" : "secondary"}>
            {course.is_published ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{course.title}</h3>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Badge variant="outline" className="text-xs">
            {moduleCount} {moduleCount === 1 ? "module" : "modules"}
          </Badge>
          {isManager && assignmentCount > 0 && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              {assignmentCount} {assignmentCount === 1 ? "assignment" : "assignments"}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Pass: {course.passing_score}%
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        {isManager ? (
          <Button 
            size="sm" 
            onClick={() => navigate(`/manager/courses/${course.id}`)} 
            className="gap-1"
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>
        ) : (
          <Button size="sm" onClick={() => navigate(`/courses/${course.id}`)} className="gap-1">
            <Play className="w-3 h-3" />
            Start
          </Button>
        )}
        {canShowActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(course.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(course.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}
