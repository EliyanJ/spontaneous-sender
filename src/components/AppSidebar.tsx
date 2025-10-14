import { Search, Building2, Mail, Ban, BarChart3, Bell, HelpCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

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
            <SidebarMenu className="space-y-2 px-3">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    isActive={activeTab === item.value}
                    className="w-full py-3"
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
      
      <SidebarFooter className="border-t p-4 space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => onTabChange("notifications")}
        >
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={() => onTabChange("support")}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Support
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
