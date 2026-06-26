import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { useOrganizations, Organization } from "@/hooks/useOrganizations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Globe, Lock, Pencil, Trash2, Loader2 } from "lucide-react";

export default function OrganizationManagement() {
  const { organizations, isLoading, createOrganization, updateOrganization, deleteOrganization } = useOrganizations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgForm, setOrgForm] = useState({
    name: "",
    accessType: "private" as "public" | "private",
    description: "",
  });

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setOrgForm({
        name: org.name,
        accessType: org.access_type,
        description: org.description || "",
      });
    } else {
      setEditingOrg(null);
      setOrgForm({ name: "", accessType: "private", description: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveOrganization = async () => {
    if (!orgForm.name.trim()) return;

    if (editingOrg) {
      await updateOrganization.mutateAsync({
        id: editingOrg.id,
        name: orgForm.name,
        accessType: orgForm.accessType,
        description: orgForm.description,
      });
    } else {
      await createOrganization.mutateAsync({
        name: orgForm.name,
        accessType: orgForm.accessType,
        description: orgForm.description,
      });
    }

    setIsDialogOpen(false);
    setEditingOrg(null);
    setOrgForm({ name: "", accessType: "private", description: "" });
  };

  const handleDeleteOrganization = async (id: string, name: string) => {
    if (name === "Internal") {
      return; // Don't allow deletion of Internal org
    }
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteOrganization.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <AppSidebar>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppSidebar>
    );
  }

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Organizations</h1>
                <p className="text-muted-foreground text-sm">
                  Manage organizations and their access types
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingOrg ? "Edit Organization" : "Create Organization"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingOrg
                      ? "Update organization details"
                      : "Add a new organization to the system"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      placeholder="Acme Corp"
                      disabled={editingOrg?.name === "Internal"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Type</Label>
                    <RadioGroup
                      value={orgForm.accessType}
                      onValueChange={(value) =>
                        setOrgForm({ ...orgForm, accessType: value as "public" | "private" })
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="flex items-center gap-1 cursor-pointer">
                          <Globe className="h-4 w-4" />
                          Public
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="flex items-center gap-1 cursor-pointer">
                          <Lock className="h-4 w-4" />
                          Private
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground mt-1">
                      {orgForm.accessType === "public"
                        ? "Members can access all public courses and modules"
                        : "Members can only access courses from their organization"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgDesc">Description (Optional)</Label>
                    <Textarea
                      id="orgDesc"
                      value={orgForm.description}
                      onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                      placeholder="Brief description of the organization"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveOrganization}
                    disabled={
                      createOrganization.isPending ||
                      updateOrganization.isPending ||
                      !orgForm.name.trim()
                    }
                  >
                    {createOrganization.isPending || updateOrganization.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingOrg ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Organizations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Access Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No organizations found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {org.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={org.access_type === "public" ? "default" : "secondary"}
                          >
                            {org.access_type === "public" ? (
                              <>
                                <Globe className="h-3 w-3 mr-1" />
                                Public
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {org.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.is_active ? "default" : "outline"}>
                            {org.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(org)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {org.name !== "Internal" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteOrganization(org.id, org.name)}
                                disabled={deleteOrganization.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppSidebar>
  );
}
