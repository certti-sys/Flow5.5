import { useState, useRef } from "react";
import { User, Mail, Lock, Camera, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/utils/uploadToStorage";

export default function AdminProfile() {
  const { user, profile } = useAuth();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploadingAvatar(true);
    try {
      const avatarPath = await uploadFile(file, `avatars/${user.id}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarPath })
        .eq('user_id', user.id);

      if (error) throw error;

      setAvatarUrl(avatarPath);
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsChangingPassword(true);
    try {
      // Primeiro, verificar a senha atual fazendo login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (signInError) {
        toast.error("Senha atual incorreta");
        return;
      }

      // Se a senha atual está correta, atualizar para a nova
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error("Erro ao alterar senha", {
        description: error.message
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            Perfil do Administrador
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        {/* Profile Header Card */}
        <Card className="glass-card border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-primary/30">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={profile?.name} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                    {profile?.name ? getInitials(profile.name) : "AD"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {profile?.name || "Administrador"}
                  </h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-md">
                    ADMIN
                  </span>
                </div>
                <p className="text-muted-foreground flex items-center gap-2 justify-center sm:justify-start">
                  <Mail className="w-4 h-4" />
                  {profile?.email}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Recente'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="glass-card border-white/10 mb-6">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-surface border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-12 bg-surface border-white/10 opacity-60 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <Button type="submit" className="gold-button" disabled={isUpdatingProfile}>
                {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 bg-surface border-white/10"
                />
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 bg-surface border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="h-12 bg-surface border-white/10"
                />
              </div>

              <Button type="submit" className="gold-button" disabled={isChangingPassword}>
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
