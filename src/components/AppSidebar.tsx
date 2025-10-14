import { Search, Building2, Mail, Ban, BarChart3 } from "lucide-react";
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
  { title: "Entreprises", icon: Building2, value: "companies" },
  { title: "Campagnes", icon: Mail, value: "campaigns" },
  { title: "Statistiques", icon: BarChart3, value: "statistics" },
  { title: "Blacklist", icon: Ban, value: "blacklist" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-6">
          <h1 className="font-display text-xl font-bold">Prospection</h1>
          <p className="text-xs text-muted-foreground mt-1">Entreprises B2B</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
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
