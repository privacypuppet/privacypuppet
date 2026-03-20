"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch() {
        // Hide the ad widget if it exists
        try {
            const ad = document.getElementById("pp-ad-widget");
            if (ad) ad.style.display = "none";
        } catch { }
    }

    render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="w-full h-dvh flex flex-col items-center justify-center bg-black text-white gap-5 p-8 relative z-[99999]">
                        <div className="text-6xl">🎭</div>
                        <h2
                            className="text-lg font-bold tracking-tight"
                            style={{ color: "#7c5cfc" }}
                        >
                            PrivacyPuppet
                        </h2>
                        <p className="text-white/60 text-sm text-center max-w-[280px] leading-relaxed">
                            This in-app browser doesn&apos;t support 3D rendering.
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 max-w-[300px]">
                            <p className="text-white/80 text-xs text-center leading-relaxed font-[system-ui]">
                                Tap the <strong className="text-white">⋯</strong> or{" "}
                                <strong className="text-white">Share</strong> button, then select{" "}
                                <strong style={{ color: "#7c5cfc" }}>
                                    &ldquo;Open in Safari&rdquo;
                                </strong>{" "}
                                or{" "}
                                <strong style={{ color: "#7c5cfc" }}>
                                    &ldquo;Open in Chrome&rdquo;
                                </strong>
                            </p>
                        </div>
                        <p className="text-white/25 text-[10px] tracking-wider uppercase mt-2">
                            privacypuppet.com
                        </p>
                    </div>
                )
            );
        }

        return this.props.children;
    }
}
