import { Search, Building2, Briefcase, Mail, Send, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Recherche", icon: Search, value: "search" },
  { title: "Entreprises", icon: Building2, value: "entreprises" },
  { title: "Offres d'emploi", icon: Briefcase, value: "jobs" },
  { title: "Emails", icon: Mail, value: "emails" },
  { title: "Campagnes", icon: Send, value: "campaigns" },
  { title: "Paramètres", icon: Settings, value: "settings" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="pt-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className={`w-full py-3 px-4 rounded-lg transition-all duration-200 ${
                      activeTab === item.value
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
