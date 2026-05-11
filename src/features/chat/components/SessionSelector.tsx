/**
 * Session Selector - UI for selecting/loading saved sessions
 */

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAcpAdapter } from "@/features/chat/context/AcpContext";
import type { SessionSummary } from "@/core/models/session-persistence";
import { useSessions } from "@/features/chat/hooks/useSessions";
import "./SessionSelector.css";

interface SessionSelectorProps {
	onSelectSession?: (sessionId: string) => void;
	onNewSession?: () => void;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
	onSelectSession,
	onNewSession,
}) => {
	const { loadSessions } = useSessions(null);

	const [sessions, setSessions] = useState<SessionSummary[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const loadSessionsData = useCallback(async () => {
		setIsLoading(true);
		const loadedSessions = await loadSessions();
		setSessions(loadedSessions);
		setIsLoading(false);
	}, [loadSessions]);

	useEffect(() => {
		void loadSessionsData();
	}, [loadSessionsData]);

	const handleSessionClick = async (sessionId: string) => {
		if (onSelectSession) {
			onSelectSession(sessionId);
		}
	};

	const handleNewSession = () => {
		if (onNewSession) {
			onNewSession();
		}
	};

	if (isLoading) {
		return (
			<div className="session-selector-container">
				<div className="session-selector-loading">Loading sessions...</div>
			</div>
		);
	}

	return (
		<div className="session-selector-container">
			<div className="session-selector-header">
				<h2 className="session-selector-title">Sessions</h2>
				{onNewSession && (
					<button
						type="button"
						className="session-selector-new-btn"
						onClick={handleNewSession}
						aria-label="New session"
					>
						+<span>New Session</span>
					</button>
				)}
			</div>

			{sessions.length === 0 ? (
				<div className="session-selector-empty">
					<p>No saved sessions yet</p>
				</div>
			) : (
				<div className="session-selector-list">
					{sessions.map((session) => (
						<button
							key={session.id}
							type="button"
							className="session-selector-item"
							onClick={() => handleSessionClick(session.id)}
							aria-label={`Load session: ${session.title}`}
						>
							<div className="session-item-main">
								<span className="session-item-title">{session.title}</span>
								<span className="session-item-meta">
									{new Date(session.updatedAt).toLocaleDateString()}
								</span>
							</div>
							<div className="session-item-details">
								<span className="session-item-count">
									{session.messageCount} messages
								</span>
								{session.tags && session.tags.length > 0 && (
									<span className="session-item-tags">
										{session.tags.slice(0, 3).map((tag) => (
											<span key={tag} className="session-item-tag">
												#{tag}
											</span>
										))}
										{session.tags.length > 3 && (
											<span className="session-item-tags-more">
												+{session.tags.length - 3}
											</span>
										)}
									</span>
								)}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default SessionSelector;
