"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedTab, setSelectedTab] = React.useState(value || defaultValue || "")
    
    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedTab(value)
      }
    }, [value])
    
    const handleTabChange = React.useCallback((newValue: string) => {
      if (value === undefined) {
        setSelectedTab(newValue)
      }
      onValueChange?.(newValue)
    }, [onValueChange, value])
    
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              selectedTab,
              onTabChange: handleTabChange
            })
          }
          return child
        })}
      </div>
    )
  }
)
Tabs.displayName = "Tabs"

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  selectedTab?: string
  onTabChange?: (value: string) => void
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, selectedTab, onTabChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
          className
        )}
        {...props}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              selectedTab,
              onTabChange
            })
          }
          return child
        })}
      </div>
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  selectedTab?: string
  onTabChange?: (value: string) => void
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, selectedTab, onTabChange, children, ...props }, ref) => {
    const isActive = selectedTab === value
    
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? "active" : "inactive"}
        onClick={() => onTabChange?.(value)}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  selectedTab?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, selectedTab, children, ...props }, ref) => {
    const isActive = selectedTab === value
    
    if (!isActive) return null
    
    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state={isActive ? "active" : "inactive"}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
