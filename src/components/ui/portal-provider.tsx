/**
 * Portal Provider
 *
 * Provides a portal container for all popup UI components.
 * Ensures portals are rendered within the plugin's root element,
 * maintaining CSS scoping and stacking context.
 */

import React, {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useRef,
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
	const portalRef = useRef<HTMLElement | null>(null);

	// Use provided container or create ref
	const portalContainer = container || portalRef.current;

	const value: PortalContextValue = {
		portalContainer,
	};

	return (
		<PortalContext.Provider value={value}>
			{children}
			{!container && (
				<div
					ref={portalRef as RefObject<HTMLDivElement>}
					className="eragear-portal-container"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						pointerEvents: "none",
					}}
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
