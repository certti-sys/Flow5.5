import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, Upload, Trash2, User, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ImageCropper } from "@/components/ImageCropper";
import { readFileAsDataURL } from "@/lib/imageUtils";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  whatsapp: z.string().min(10, "WhatsApp inválido").max(20).optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    name: string;
    email: string;
    whatsapp?: string | null;
    avatar_url?: string | null;
  } | null;
}

export const EditProfileModal = ({ open, onOpenChange, profile }: EditProfileModalProps) => {
  const { user, resetPassword } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      whatsapp: profile?.whatsapp || "",
    },
  });

  // Reset form when profile changes to ensure data is always in sync
  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        email: profile.email || "",
        whatsapp: profile.whatsapp || "",
      });
    }
  }, [profile, form]);

  const currentAvatarUrl = avatarPreview || profile?.avatar_url;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setSelectedImage(dataUrl);
      setCropperOpen(true);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Erro ao ler a imagem");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      // Create file name with timestamp to avoid cache issues
      const fileName = `${user.id}/avatar_${Date.now()}.jpg`;

      // Delete old avatar if exists
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToDelete);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarPreview(newAvatarUrl);

      // Invalidate queries to update avatar everywhere
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success("Foto atualizada com sucesso!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploadingAvatar(false);
      setSelectedImage(null);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      // Delete avatar files from storage
      const { data: existingFiles } = await supabase.storage
        .from("avatars")
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(filesToDelete);
      }

      // Clear avatar URL in profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarPreview(null);

      // Invalidate queries to update avatar everywhere
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success("Foto removida com sucesso!");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Erro ao remover foto");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          whatsapp: data.whatsapp || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Invalidate queries to update profile everywhere
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      toast.success("Perfil atualizado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = () => {
    setShowChangePassword(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-xl p-0 overflow-hidden bg-black/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left space-y-1">
                <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Editar Perfil</DialogTitle>
                <DialogDescription className="text-[14px] text-muted-foreground m-0">
                  Gerencie suas informações cadastrais e fotos de perfil
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="bg-black/20 border border-white/5 rounded-[12px] p-6 flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 ring-4 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40">
                      <AvatarImage src={currentAvatarUrl || ""} />
                      <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                        {profile?.name ? getInitials(profile.name) : "U"}
                      </AvatarFallback>
                    </Avatar>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-7 w-7 text-white animate-spin" />
                      ) : (
                        <Camera className="h-7 w-7 text-white" />
                      )}
                    </button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="h-9 px-4 glass-card border-white/10 hover:bg-white/5 text-white font-medium"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? "Enviando..." : "Alterar"}
                    </Button>

                    {currentAvatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="h-9 px-4 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>

                {/* Information Group */}
                <div className="bg-black/20 border border-white/5 rounded-[12px] p-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80 font-medium text-sm">Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome"
                            {...field}
                            className="bg-black/20 border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/30 h-[44px] rounded-[10px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80 font-medium text-sm">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                            disabled
                            className="bg-black/10 border-white/5 text-white/40 h-[44px] rounded-[10px] cursor-not-allowed"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80 font-medium text-sm">WhatsApp</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+55 11 99999-9999"
                            {...field}
                            className="bg-black/20 border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/30 h-[44px] rounded-[10px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Security Link */}
                <div className="px-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    Alterar Senha de Acesso
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-[44px] px-6 rounded-[12px] bg-primary hover:bg-primary/90 text-white font-bold min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal */}
      {selectedImage && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          cropShape="round"
        />
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
    </>
  );
};
