"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import Head from "./Head";

export type SceneConfig = {
  url: string;
  position: [number, number, number];
  scale: number;
};

const BG_GRADIENTS: Record<string, string> = {
  space: "radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)",
  sunset: "linear-gradient(135deg, #fceabb 0%, #f8b500 100%)",
  ocean: "linear-gradient(180deg, #2b5876 0%, #4e4376 100%)",
  cyberpunk: "linear-gradient(45deg, #ff00cc 0%, #333399 100%)",
  void: "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0f 100%)",
};

const BG_IMAGES: Record<string, string> = {
  office: "/backgrounds/office.png",
  lounge: "/backgrounds/lounge.png",
};

export default function Scene({
  config,
  bgName = "void",
}: {
  config: SceneConfig;
  bgName?: string;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const effectiveBgName = (config as any).background || bgName;
  const isImage = effectiveBgName in BG_IMAGES;
  const bgStyle: React.CSSProperties = isImage
    ? {
      backgroundImage: `url(${BG_IMAGES[effectiveBgName]})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }
    : { background: BG_GRADIENTS[effectiveBgName] || BG_GRADIENTS.void };

  if (!isClient) {
    return (
      <div className="w-full h-full absolute inset-0 bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading engine...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0" style={bgStyle}>
      <Canvas
        camera={{ position: [0, 0, 0.8], fov: 40, near: 0.01, far: 100 }}
        gl={{ antialias: true, toneMappingExposure: 1.0, alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Environment preset="studio" background={false} />

          <group position={[0, -0.1, 0]}>
            <Head
              key={config.url}
              modelUrl={config.url}
              position={config.position}
              scale={config.scale}
            />
          </group>

          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 0, 5]} intensity={0.5} />
        </Suspense>
      </Canvas>
    </div>
  );
}
