import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuBadge, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";

export default function MCPServersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
        <SidebarTrigger className="fixed top-4 left-4 z-50" />
      </div>
    </SidebarProvider>
  );
}
