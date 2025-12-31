import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { App, ButtonComponent, Notice } from "obsidian";
import { RelayClient } from "../../relay/relay-client";

interface PairingViewProps {
	app: App;
	relayUrl: string;
}

export const PairingView: React.FC<PairingViewProps> = ({ app, relayUrl }) => {
	const [client, setClient] = useState<RelayClient | null>(null);
	const [sessionInfo, setSessionInfo] = useState<{
		sessionId: string;
		key: string;
	} | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	// Initialize client ref/state one time?
	// Or should we create it when user clicks Start?
	// Let's create on start for now or persist it?
	// Ideally the client assumes lifecycle of the plugin, but here we scope it to the view for simplicity in Phase 1.

	const handleConnect = async () => {
		try {
			const newClient = new RelayClient(app, relayUrl);
			const info = await newClient.connect();
			setClient(newClient);
			setSessionInfo(info);
			setIsConnected(true);
		} catch (e) {
			new Notice("Failed to start relay session");
			console.error(e);
		}
	};

	const handleDisconnect = () => {
		if (client) {
			client.disconnect();
			setClient(null);
			setSessionInfo(null);
			setIsConnected(false);
		}
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (client) {
				// Optional: Maybe we DON'T want to disconnect if we switch tabs?
				// But for now, let's keep it simple.
				client.disconnect();
			}
		};
	}, [client]);

	const qrData = sessionInfo
		? JSON.stringify({
				s: sessionInfo.sessionId,
				k: sessionInfo.key,
				u: relayUrl,
			})
		: "";

	return (
		<div
			className="pairing-container"
			style={{ padding: "20px", textAlign: "center" }}
		>
			<h3>Remote Pairing</h3>
			<p style={{ marginBottom: "20px", color: "var(--text-muted)" }}>
				Scan this code with the Eragear Web App to connect this vault securely.
			</p>

			{!isConnected ? (
				<button 
					className="mod-cta" 
					onClick={handleConnect}
					aria-label="Start remote pairing session"
				>
					Start Remote Session
				</button>
			) : (
				<div className="active-session">
					<div
						style={{
							background: "white",
							padding: "16px",
							borderRadius: "8px",
							display: "inline-block",
							marginBottom: "20px",
						}}
					>
						{sessionInfo && (
							<QRCodeSVG
								value={qrData}
								size={200}
								level={"H"}
								includeMargin={true}
							/>
						)}
					</div>

					<div
						style={{
							marginBottom: "20px",
							fontFamily: "monospace",
							fontSize: "0.8em",
						}}
					>
						Session: {sessionInfo?.sessionId.slice(0, 8)}...
					</div>

					<button 
						className="mod-warning" 
						onClick={handleDisconnect}
						aria-label="Stop remote pairing session"
					>
						Stop Session
					</button>
				</div>
			)}
		</div>
	);
};
