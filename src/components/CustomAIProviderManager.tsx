import { useState } from "react";
import { useCustomAIProviders, CustomAIProvider, CreateCustomProviderInput } from "@/hooks/useCustomAIProviders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, Globe, Key, Settings2, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomAIProviderManager() {
  const { providers, loading, createProvider, updateProvider, deleteProvider } = useCustomAIProviders();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CustomAIProvider | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteProvider(id);
      toast.success("Custom AI provider deleted");
    } catch (error) {
      toast.error("Failed to delete provider");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleActive = async (provider: CustomAIProvider) => {
    try {
      await updateProvider(provider.id, { isActive: !provider.is_active });
      toast.success(`Provider ${provider.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error("Failed to update provider");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Provider Button */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom AI Provider
          </Button>
        </DialogTrigger>
        <AddProviderDialog
          onClose={() => setIsAddDialogOpen(false)}
          onCreate={createProvider}
        />
      </Dialog>

      {/* Provider List */}
      {providers.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No custom AI providers yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your own AI providers to use them for content or quiz generation
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                provider.is_active ? "bg-card" : "bg-muted/30 opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{provider.name}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      provider.ai_type === 'content' ? 'bg-violet-500/20 text-violet-600' :
                      provider.ai_type === 'quiz' ? 'bg-amber-500/20 text-amber-600' :
                      'bg-blue-500/20 text-blue-600'
                    )}>
                      {provider.ai_type === 'both' ? 'Content & Quiz' : provider.ai_type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {provider.api_endpoint}
                  </p>
                  {provider.models.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.models.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={provider.is_active}
                    onCheckedChange={() => handleToggleActive(provider)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingProvider(provider)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(provider.id)}
                    disabled={isDeleting === provider.id}
                  >
                    {isDeleting === provider.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingProvider && (
        <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
          <EditProviderDialog
            provider={editingProvider}
            onClose={() => setEditingProvider(null)}
            onUpdate={updateProvider}
          />
        </Dialog>
      )}
    </div>
  );
}

function AddProviderDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateCustomProviderInput) => Promise<CustomAIProvider>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    providerKey: '',
    apiEndpoint: '',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer ',
    aiType: 'both' as 'content' | 'quiz' | 'both',
    models: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.providerKey || !formData.apiEndpoint) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse models from comma-separated string
      const models = formData.models
        .split(',')
        .map(m => m.trim())
        .filter(Boolean)
        .map(m => ({ id: m.toLowerCase().replace(/\s+/g, '-'), name: m }));

      await onCreate({
        name: formData.name,
        providerKey: formData.providerKey.toLowerCase().replace(/\s+/g, '-'),
        apiEndpoint: formData.apiEndpoint,
        apiKeyHeader: formData.apiKeyHeader,
        apiKeyPrefix: formData.apiKeyPrefix,
        aiType: formData.aiType,
        models,
        description: formData.description || undefined,
      });

      toast.success("Custom AI provider added");
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('duplicate key')) {
        toast.error("A provider with this key already exists");
      } else {
        toast.error("Failed to add provider");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Add Custom AI Provider</DialogTitle>
        <DialogDescription>
          Configure a custom AI provider to use for content or quiz generation
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Provider Name *</Label>
          <Input
            id="name"
            placeholder="e.g., My Custom GPT"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="providerKey">Provider Key *</Label>
          <Input
            id="providerKey"
            placeholder="e.g., my-custom-gpt"
            value={formData.providerKey}
            onChange={(e) => setFormData(prev => ({ ...prev, providerKey: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Unique identifier for this provider</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiEndpoint">API Endpoint *</Label>
          <Input
            id="apiEndpoint"
            placeholder="https://api.example.com/v1/chat/completions"
            value={formData.apiEndpoint}
            onChange={(e) => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="apiKeyHeader">API Key Header</Label>
            <Input
              id="apiKeyHeader"
              placeholder="Authorization"
              value={formData.apiKeyHeader}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKeyHeader: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKeyPrefix">API Key Prefix</Label>
            <Input
              id="apiKeyPrefix"
              placeholder="Bearer "
              value={formData.apiKeyPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKeyPrefix: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiType">Use For</Label>
          <Select
            value={formData.aiType}
            onValueChange={(v) => setFormData(prev => ({ ...prev, aiType: v as 'content' | 'quiz' | 'both' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="content">Content & Image AI</SelectItem>
              <SelectItem value="quiz">Quiz AI</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="models">Available Models</Label>
          <Input
            id="models"
            placeholder="model-1, model-2, model-3"
            value={formData.models}
            onChange={(e) => setFormData(prev => ({ ...prev, models: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Comma-separated list of model names</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Optional description..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Provider'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditProviderDialog({
  provider,
  onClose,
  onUpdate,
}: {
  provider: CustomAIProvider;
  onClose: () => void;
  onUpdate: (id: string, input: { name?: string; apiEndpoint?: string; aiType?: 'content' | 'quiz' | 'both'; models?: { id: string; name: string }[]; description?: string }) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: provider.name,
    apiEndpoint: provider.api_endpoint,
    aiType: provider.ai_type,
    models: provider.models.map(m => m.name).join(', '),
    description: provider.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.apiEndpoint) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const models = formData.models
        .split(',')
        .map(m => m.trim())
        .filter(Boolean)
        .map(m => ({ id: m.toLowerCase().replace(/\s+/g, '-'), name: m }));

      await onUpdate(provider.id, {
        name: formData.name,
        apiEndpoint: formData.apiEndpoint,
        aiType: formData.aiType,
        models,
        description: formData.description || undefined,
      });

      toast.success("Provider updated");
      onClose();
    } catch (error) {
      toast.error("Failed to update provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit AI Provider</DialogTitle>
        <DialogDescription>
          Update the configuration for {provider.name}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Provider Name *</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-endpoint">API Endpoint *</Label>
          <Input
            id="edit-endpoint"
            value={formData.apiEndpoint}
            onChange={(e) => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-type">Use For</Label>
          <Select
            value={formData.aiType}
            onValueChange={(v) => setFormData(prev => ({ ...prev, aiType: v as 'content' | 'quiz' | 'both' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="content">Content & Image AI</SelectItem>
              <SelectItem value="quiz">Quiz AI</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-models">Available Models</Label>
          <Input
            id="edit-models"
            placeholder="model-1, model-2, model-3"
            value={formData.models}
            onChange={(e) => setFormData(prev => ({ ...prev, models: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
