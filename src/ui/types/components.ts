/**
 * Types for UI Components
 */

import type React from "react";

export interface ActionCardProps {
    title: string;
    description?: string;
    icon: string;
    variant?: "safe" | "destructive" | "default";
    children: React.ReactNode;
}

export interface ActionCardGroupProps {
    title: string;
    children: React.ReactNode;
}

export interface GlobalContextBarProps {
    app: any;
    selectedFile: any | null;
    onFileSelect: (file: any) => void;
}

export interface TabNavigationProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export interface Tab {
    id: string;
    icon: string;
    label: string;
    tooltip: string;
}

export interface ConsoleLogProps {
    testOutputs: any[];
    onClear: () => void;
}
