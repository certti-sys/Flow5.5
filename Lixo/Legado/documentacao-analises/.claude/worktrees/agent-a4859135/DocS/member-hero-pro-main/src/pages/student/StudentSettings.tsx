import { useState } from "react";
import { Settings, Bell, Shield, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";

export default function StudentSettings() {
  const [notifications, setNotifications] = useState({
    newLessons: true,
    newModules: true,
    courseUpdates: true,
    newsletter: false,
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success("Configuração atualizada");
  };

  const handleDeleteAccount = () => {
    toast.error("Funcionalidade de exclusão de conta em breve");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="w-10 h-10 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie suas preferências e configurações da plataforma
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-surface border border-white/10">
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 mr-2" />
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="account">
              <Trash2 className="w-4 h-4 mr-2" />
              Conta
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle>Notificações por Email</CardTitle>
                <CardDescription>
                  Escolha quais notificações você deseja receber
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newLessons">Novas aulas adicionadas</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações quando novas aulas forem adicionadas aos seus cursos
                    </p>
                  </div>
                  <Switch
                    id="newLessons"
                    checked={notifications.newLessons}
                    onCheckedChange={() => handleNotificationChange('newLessons')}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newModules">Novos módulos</Label>
                    <p className="text-sm text-muted-foreground">
                      Seja notificado quando novos módulos forem lançados
                    </p>
                  </div>
                  <Switch
                    id="newModules"
                    checked={notifications.newModules}
                    onCheckedChange={() => handleNotificationChange('newModules')}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="courseUpdates">Atualizações de cursos</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba atualizações sobre mudanças nos seus cursos
                    </p>
                  </div>
                  <Switch
                    id="courseUpdates"
                    checked={notifications.courseUpdates}
                    onCheckedChange={() => handleNotificationChange('courseUpdates')}
                  />
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newsletter">Newsletter</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba dicas, novidades e conteúdos exclusivos
                    </p>
                  </div>
                  <Switch
                    id="newsletter"
                    checked={notifications.newsletter}
                    onCheckedChange={() => handleNotificationChange('newsletter')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle>Configurações de Privacidade</CardTitle>
                <CardDescription>
                  Controle quem pode ver suas informações e atividades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showProgress">Mostrar progresso</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que outros vejam seu progresso nos cursos
                    </p>
                  </div>
                  <Switch id="showProgress" defaultChecked />
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showProfile">Perfil público</Label>
                    <p className="text-sm text-muted-foreground">
                      Tornar seu perfil visível para outros alunos
                    </p>
                  </div>
                  <Switch id="showProfile" defaultChecked />
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showActivity">Atividade recente</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar suas atividades recentes na plataforma
                    </p>
                  </div>
                  <Switch id="showActivity" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card className="glass-card border-white/10 border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
                <CardDescription>
                  Ações irreversíveis relacionadas à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ao excluir sua conta, todos os seus dados serão permanentemente removidos. 
                    Esta ação não pode ser desfeita.
                  </p>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir minha conta
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card border-destructive/50">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Esta ação não pode ser desfeita. Isso irá excluir permanentemente sua conta
                          e remover todos os seus dados de nossos servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-surface border-white/10">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Sim, excluir minha conta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
