/**
 * ACP Context - Provides access to AcpAdapter for terminal operations
 */

import { createContext, type ReactNode, useContext } from "react";
import type { AcpAdapter } from "@/core/acp/acp.adapter";

interface AcpContextValue {
	acpAdapter: AcpAdapter | null;
}

const AcpContext = createContext<AcpContextValue>({ acpAdapter: null });

export interface AcpContextProviderProps {
	children: ReactNode;
	acpAdapter: AcpAdapter | null;
}

export function AcpContextProvider({
	children,
	acpAdapter,
}: AcpContextProviderProps) {
	return (
		<AcpContext.Provider value={{ acpAdapter }}>{children}</AcpContext.Provider>
	);
}

/**
 * Hook to access AcpAdapter
 */
export function useAcpAdapter(): AcpAdapter | null {
	const context = useContext(AcpContext);
	return context.acpAdapter;
}
