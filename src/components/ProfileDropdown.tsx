import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

interface ProfileDropdownProps {
  onNavigateToSettings?: () => void;
}

export const ProfileDropdown = ({ onNavigateToSettings }: ProfileDropdownProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getInitials = () => {
    if (!user?.email) return "U";
    const email = user.email;
    return email.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center justify-center rounded-full transition-all duration-200 hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Menu profil"
        >
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-popover border border-border shadow-lg z-50"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-foreground">Mon compte</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || "Non connecté"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onNavigateToSettings}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres du profil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
