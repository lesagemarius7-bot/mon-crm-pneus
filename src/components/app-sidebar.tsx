"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  Gauge,
  KanbanSquare,
  List,
  LogOut,
  Mail,
  Settings,
  Truck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import { signOutAction } from "@/lib/actions/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Entreprises", url: "/companies", icon: Building2 },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Flottes", url: "/vehicles", icon: Truck },
  { title: "Deals", url: "/deals", icon: KanbanSquare },
  { title: "Tâches", url: "/tasks", icon: CheckSquare },
];

const AUTOMATION_NAV_ITEMS = [
  { title: "Templates", url: "/templates", icon: Mail },
  { title: "Séquences", url: "/sequences", icon: Workflow },
  { title: "Listes", url: "/lists", icon: List },
  { title: "Automatisations", url: "/automations", icon: Zap },
];

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/companies" />}>
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Gauge className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Pneus Industriels</span>
                <span className="text-xs text-muted-foreground">CRM</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Vues</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {AUTOMATION_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={pathname.startsWith("/settings")}
              tooltip="Paramètres"
            >
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOutAction}>
              <SidebarMenuButton type="submit" tooltip={userEmail ?? "Déconnexion"}>
                <LogOut />
                <span className="truncate">{userEmail ?? "Déconnexion"}</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
