"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ControlsProps {
    meshRef: React.RefObject<THREE.Mesh>;
}

export default function Controls({ meshRef }: ControlsProps) {
    const mouse = useRef({ x: 0, y: 0 });

    // Jaw open state — toggled by custom event only
    const [jawOpen, setJawOpen] = useState(false);

    // Smooth jaw via manual lerp instead of spring (no bounce/wobble)
    const jawTarget = useRef(1.0);
    const jawCurrent = useRef(1.0);

    useEffect(() => {
        jawTarget.current = jawOpen ? 1.2 : 1.0;
    }, [jawOpen]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            // Ignore synthetic mouse events from UI element taps
            const target = event.target as HTMLElement;
            if (target.closest("button, a, #pp-ad-widget, [data-no-track]")) return;
            mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (event.touches.length > 0) {
                // Ignore touches on UI elements (buttons, links, ad widget)
                const target = event.target as HTMLElement;
                if (target.closest("button, a, #pp-ad-widget, [data-no-track]")) return;
                const touch = event.touches[0];
                mouse.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
                mouse.current.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            }
        };

        const handleJawToggle = () => {
            setJawOpen(prev => !prev);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchstart", handleTouchMove);
        window.addEventListener("jaw-toggle", handleJawToggle);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchstart", handleTouchMove);
            window.removeEventListener("jaw-toggle", handleJawToggle);
        };
    }, []);

    // Phase offsets for organic idle motion
    const noiseOffset = useRef(Math.random() * 100);

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.getElapsedTime();

        // ─── Target rotation from mouse ───
        const targetYaw = mouse.current.x * 0.6;
        const targetPitch = -mouse.current.y * 0.4 + 0.22; // offset: center cursor = look straight ahead

        // ─── Idle micro-sway (always-on, organic) ───
        const swayX = Math.sin(time * 0.7 + noiseOffset.current) * 0.015
            + Math.sin(time * 1.3 + noiseOffset.current * 2) * 0.008;
        const swayY = Math.cos(time * 0.5 + noiseOffset.current) * 0.012
            + Math.cos(time * 1.1 + noiseOffset.current * 3) * 0.006;

        // ─── Micro-jitter (high freq, very subtle) ───
        const jitterX = Math.sin(time * 18 + noiseOffset.current) * 0.003;
        const jitterY = Math.cos(time * 14 + noiseOffset.current) * 0.003;

        // ─── Smooth lerp to target + sway + jitter ───
        meshRef.current.rotation.y = THREE.MathUtils.lerp(
            meshRef.current.rotation.y,
            targetYaw + swayY + jitterX,
            0.08
        );

        meshRef.current.rotation.x = THREE.MathUtils.lerp(
            meshRef.current.rotation.x,
            targetPitch + swayX + jitterY,
            0.08
        );

        // ─── Jaw via smooth lerp (no spring bounce) ───
        // Slower opening (0.035) for a gradual mouth drop, closing stays at 0.06
        const jawLerpSpeed = jawTarget.current > jawCurrent.current ? 0.035 : 0.06;
        jawCurrent.current = THREE.MathUtils.lerp(jawCurrent.current, jawTarget.current, jawLerpSpeed);
        meshRef.current.scale.set(1, jawCurrent.current, 1);

        // ─── Breathing oscillation via scale.z ───
        const breathPhase = Math.sin(time * 0.8) * 0.5 + 0.5;
        meshRef.current.scale.z = 1.0 + breathPhase * 0.01;
    });

    return null;
}
