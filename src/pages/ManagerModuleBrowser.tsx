import { Link } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { useSharedModuleLibrary } from "@/hooks/useSharedModuleLibrary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Loader2, 
  ArrowLeft, 
  FileText, 
  Presentation,
  Globe,
  Lock,
  User
} from "lucide-react";

export default function ManagerModuleBrowser() {
  const { 
    modules, 
    isLoading, 
    searchQuery, 
    setSearchQuery,
    sortBy,
    setSortBy 
  } = useSharedModuleLibrary();

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-gradient-subtle">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-gradient-subtle">
        <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/manager">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Available Modules</h1>
            <p className="text-muted-foreground">
              Browse modules you have access to for creating courses
            </p>
          </div>
          <Button asChild>
            <Link to="/courses/create">Create Course</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Module Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {modules.length} module{modules.length !== 1 ? "s" : ""} available
        </p>

        {/* Modules Grid */}
        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No modules match your search" 
                  : "No modules available. Contact your administrator for access."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((module) => (
              <Card key={module.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                {module.thumbnail_url ? (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img
                      src={module.thumbnail_url}
                      alt={module.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    {module.module_type === "presentation" ? (
                      <Presentation className="h-12 w-12 text-primary/40" />
                    ) : (
                      <FileText className="h-12 w-12 text-primary/40" />
                    )}
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {module.module_type === "presentation" ? "Presentation" : "Document"}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        module.visibility === "public" 
                          ? "border-green-500 text-green-600" 
                          : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {module.visibility === "public" ? (
                        <><Globe className="h-3 w-3 mr-1" /> Public</>
                      ) : (
                        <><Lock className="h-3 w-3 mr-1" /> Private</>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{module.title}</CardTitle>
                  {module.description && (
                    <CardDescription className="line-clamp-2">
                      {module.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {module.creator && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{module.creator.full_name || module.creator.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppSidebar>
  );
}
