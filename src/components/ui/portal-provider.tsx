/**
 * Portal Provider
 *
 * Provides a portal container for all popup UI components.
 * Ensures portals are rendered within the plugin's root element,
 * maintaining CSS scoping and stacking context.
 */

import React, {
	useCallback,
	createContext,
	type ReactNode,
	useContext,
	useState,
} from "react";

export interface PortalContextValue {
	portalContainer: HTMLElement | null;
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

export interface PortalProviderProps {
	children: ReactNode;
	container?: HTMLElement;
}

export function PortalProvider({ children, container }: PortalProviderProps) {
	const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);

	const handlePortalRef = useCallback((element: HTMLDivElement | null) => {
		setPortalElement(element);
	}, []);

	const portalContainer = container ?? portalElement;

	const value: PortalContextValue = {
		portalContainer,
	};

	return (
		<PortalContext.Provider value={value}>
			{children}
			{!container && (
				<div
					ref={handlePortalRef}
					className="eragear-portal-container"
				/>
			)}
		</PortalContext.Provider>
	);
}

/**
 * Hook to use portal container
 * Throws error if used outside provider
 */
export function usePortalContainer(): HTMLElement | null {
	const context = useContext(PortalContext);
	if (context === undefined) {
		throw new Error("usePortalContainer must be used within PortalProvider");
	}
	return context.portalContainer;
}
