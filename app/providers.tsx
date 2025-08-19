"use client";

import { ReactNode, useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { MCPProvider } from "@/lib/context/mcp-context";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useLocalStorage<boolean>(
    STORAGE_KEYS.SIDEBAR_STATE,
    true
  );

  // Initialize models at startup (like chat initialization)
  useEffect(() => {
    const initializeModels = async () => {
      try {
        console.log('🚀 APP STARTUP: Initializing models...');
        
        // Wait for the global functions to be available
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          if (typeof (window as any).debugRefreshModels === 'function') {
            console.log('✅ APP STARTUP: Global functions available, loading models...');
            await (window as any).debugRefreshModels();
            console.log('✅ APP STARTUP: Models loaded successfully');
            break;
          }
          
          console.log(`⏳ APP STARTUP: Waiting for global functions... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.error('❌ APP STARTUP: Failed to load models - global functions not available');
        }
      } catch (error) {
        console.error('❌ APP STARTUP: Error initializing models:', error);
      }
    };
    
    // Initialize models after a short delay to ensure everything is loaded
    const timer = setTimeout(initializeModels, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
        themes={["light", "dark", "sunset", "black"]}
      >
        <MCPProvider>
          <SidebarProvider defaultOpen={sidebarOpen} open={sidebarOpen} onOpenChange={setSidebarOpen}>
            {children}
            <Toaster position="top-center" richColors />
          </SidebarProvider>
        </MCPProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
} 