import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SyncIndicator } from "./SyncIndicator";

export function AdminTopbar() {
  const navigate = useNavigate();
  const { profile, signOut } = useSupabaseAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-card border-b border-border/50">
      <div className="flex h-full items-center justify-between px-6">
        {/* Search */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, students..."
            className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Sync Indicator */}
          <SyncIndicator />
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-white/5">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
          </Button>

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" />
                  <AvatarFallback className="bg-primary/20 text-primary">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">{profile?.name || "Admin User"}</p>
                <p className="text-xs text-muted-foreground">{profile?.email || "admin@memberhero.com"}</p>
              </div>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-white/5 text-red-400">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
