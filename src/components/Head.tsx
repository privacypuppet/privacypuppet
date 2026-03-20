"use client";

import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Controls from "./Controls";
import { useFrame } from "@react-three/fiber";

interface HeadProps {
    modelUrl: string;
    position: [number, number, number];
    scale: number;
}

export default function Head({ modelUrl, position, scale }: HeadProps) {
    const { scene } = useGLTF(modelUrl);
    const controlsTargetRef = useRef<THREE.Mesh>(null!);

    const headBoneRef = useRef<THREE.Object3D | null>(null);
    const neckBoneRef = useRef<THREE.Object3D | null>(null);
    const spineBoneRef = useRef<THREE.Object3D | null>(null);
    const blinkState = useRef(0);

    const isMpfbRef = useRef(false);
    const jawBoneRef = useRef<THREE.Bone | null>(null);
    const eyeLBoneRef = useRef<THREE.Bone | null>(null);
    const eyeRBoneRef = useRef<THREE.Bone | null>(null);
    // Rest quaternions — stored in scene.userData so they survive useGLTF cache reuse
    const headRestQuat = useRef(new THREE.Quaternion());
    const neckRestQuat = useRef(new THREE.Quaternion());
    const spineRestQuat = useRef(new THREE.Quaternion());
    const jawRestQuat = useRef(new THREE.Quaternion());
    const eyeLRestQuat = useRef(new THREE.Quaternion());
    const eyeRRestQuat = useRef(new THREE.Quaternion());

    const _q = useRef(new THREE.Quaternion());
    const _rot = useRef(new THREE.Quaternion());

    useEffect(() => {
        headBoneRef.current = null;
        neckBoneRef.current = null;
        spineBoneRef.current = null;
        jawBoneRef.current = null;
        eyeLBoneRef.current = null;
        eyeRBoneRef.current = null;
        isMpfbRef.current = false;

        // Detect MPFB (has a "jaw" bone; Avaturn uses morph targets instead)
        scene.traverse((obj) => {
            if (obj instanceof THREE.Bone && obj.name === "jaw") {
                isMpfbRef.current = true;
            }
        });

        const isMpfb = isMpfbRef.current;

        // Store original rest quaternions once per scene (survives useGLTF cache)
        const restQuats = scene.userData._restQuats || {};
        const firstInit = !scene.userData._restQuats;

        scene.traverse((obj) => {
            obj.frustumCulled = false;

            if (obj instanceof THREE.Bone) {
                const nameLower = obj.name.toLowerCase();

                // Head bone
                if (!headBoneRef.current && (nameLower === "head" || (nameLower.includes("head") && !nameLower.includes("headtop")))) {
                    headBoneRef.current = obj;
                    if (firstInit) restQuats.head = obj.quaternion.clone();
                    headRestQuat.current.copy(restQuats.head || obj.quaternion);
                }
                // Neck bone
                if (!neckBoneRef.current && (nameLower === "neck" || nameLower === "neck01" || nameLower === "neck02")) {
                    neckBoneRef.current = obj;
                    if (firstInit) restQuats.neck = obj.quaternion.clone();
                    neckRestQuat.current.copy(restQuats.neck || obj.quaternion);
                }
                // Spine bone
                if (!spineBoneRef.current && (nameLower.includes("spine2") || nameLower.includes("spine1") || nameLower === "spine05" || nameLower === "spine04")) {
                    spineBoneRef.current = obj;
                    if (firstInit) restQuats.spine = obj.quaternion.clone();
                    spineRestQuat.current.copy(restQuats.spine || obj.quaternion);
                }
                // Jaw
                if (nameLower === "jaw") {
                    jawBoneRef.current = obj as THREE.Bone;
                    if (firstInit) restQuats.jaw = obj.quaternion.clone();
                    jawRestQuat.current.copy(restQuats.jaw || obj.quaternion);
                }
                // Eyes (handles both "eye.L" and "eyeL" from different Blender exports)
                if (nameLower === "eye.l" || nameLower === "eyel") {
                    eyeLBoneRef.current = obj as THREE.Bone;
                    if (firstInit) restQuats.eyeL = obj.quaternion.clone();
                    eyeLRestQuat.current.copy(restQuats.eyeL || obj.quaternion);
                }
                if (nameLower === "eye.r" || nameLower === "eyer") {
                    eyeRBoneRef.current = obj as THREE.Bone;
                    if (firstInit) restQuats.eyeR = obj.quaternion.clone();
                    eyeRRestQuat.current.copy(restQuats.eyeR || obj.quaternion);
                }
            }

            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                const meshName = (mesh.name || "").toLowerCase();
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                if (isMpfb) {
                    // Hide low-poly overlay (Z-fights with body); keep high-poly (has eyes/iris)
                    if (meshName.includes("low-poly")) {
                        mesh.visible = false;
                    }
                    if (mesh.material) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach(mat => {
                            const m = mat as THREE.MeshStandardMaterial;
                            if (!m || m.roughness === undefined) return;
                            m.roughness = Math.min(1, m.roughness + 0.15);
                            const matName = (m.name || "").toLowerCase();

                            if (matName.includes("eyebrow")) {
                                // Eyebrow textures export as white strands — replace with tinted material
                                mesh.material = new THREE.MeshStandardMaterial({
                                    map: m.map,
                                    color: new THREE.Color(0.45, 0.28, 0.15),
                                    transparent: true,
                                    alphaTest: 0.01,
                                    depthWrite: true,
                                    side: THREE.DoubleSide,
                                });
                            } else if (matName.includes("makeskin") || meshName.includes("high-poly")) {
                                // High-poly eye overlay: use tight alpha cutoff to minimize outline fringe
                                m.transparent = true;
                                m.alphaTest = 0.5;
                                m.depthWrite = true;
                                m.side = THREE.FrontSide;
                                m.polygonOffset = true;
                                m.polygonOffsetFactor = -1;
                                m.polygonOffsetUnits = -1;
                            } else if (matName.includes("body")) {
                                // Body: solid, front-only, pushed behind clothes to prevent Z-fighting
                                m.transparent = false;
                                m.depthWrite = true;
                                m.side = THREE.FrontSide;
                                m.polygonOffset = true;
                                m.polygonOffsetFactor = 4;
                                m.polygonOffsetUnits = 4;
                            } else if (matName.includes("lash") || matName.includes("hair") || matName.includes("ponytail") || matName.includes("short0")) {
                                // Hair/lashes: keep original BLEND rendering
                            } else {
                                // Clothes, teeth, tongue: solid
                                m.transparent = false;
                                m.depthWrite = true;
                            }
                            m.needsUpdate = true;
                        });
                    }
                } else {
                    // Avaturn material fixes
                    if (mesh.material) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach(mat => {
                            const m = mat as THREE.MeshStandardMaterial;
                            if (!m || m.roughness === undefined) return;
                            m.roughness = Math.min(1, m.roughness + 0.15);
                            if (m.transparent) {
                                const matName = (m.name || "").toLowerCase();
                                if (matName.includes("eyebrow") || matName.includes("hair") || matName.includes("lash")) {
                                    m.transparent = true;
                                    m.depthWrite = true;
                                    m.alphaTest = 0.3;
                                } else if (matName.includes("eye") || matName.includes("cornea")) {
                                    m.transparent = true;
                                    m.depthWrite = false;
                                } else {
                                    m.transparent = false;
                                    m.depthWrite = true;
                                }
                                m.needsUpdate = true;
                            }
                        });
                    }
                }
            }
        });

        if (firstInit) scene.userData._restQuats = restQuats;

        // T-pose fix (Avaturn only — MPFB re-exports already have arms posed)
        if (!isMpfb && !scene.userData._armsPosed) {
            scene.userData._armsPosed = true;
            const armDown = 0.5;
            const forearmBend = 0.15;
            scene.traverse((obj) => {
                if (!(obj instanceof THREE.Bone)) return;
                const q = new THREE.Quaternion();
                const n = obj.name;
                if (n === "LeftShoulder") {
                    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -armDown); obj.quaternion.premultiply(q);
                } else if (n === "RightShoulder") {
                    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), armDown); obj.quaternion.premultiply(q);
                } else if (n === "LeftForeArm") {
                    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), forearmBend); obj.quaternion.multiply(q);
                } else if (n === "RightForeArm") {
                    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -forearmBend); obj.quaternion.multiply(q);
                }
            });
        }

        if (!headBoneRef.current) headBoneRef.current = scene;
    }, [scene]);

    // Auto-blink
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        const triggerBlink = () => {
            const duration = 120 + Math.random() * 60;
            const start = Date.now();
            const animate = () => {
                const elapsed = Date.now() - start;
                let progress = elapsed / duration;
                if (progress > 1) progress = 1;
                blinkState.current = progress < 0.35
                    ? progress / 0.35
                    : 1 - (progress - 0.35) / 0.65;
                if (progress < 1) requestAnimationFrame(animate);
                else blinkState.current = 0;
            };
            animate();
            const next = Math.random() < 0.15 ? 200 + Math.random() * 300 : 2000 + Math.random() * 4000;
            timeout = setTimeout(triggerBlink, next);
        };
        timeout = setTimeout(triggerBlink, 2000 + Math.random() * 2000);
        return () => clearTimeout(timeout);
    }, []);

    useFrame((state) => {
        if (!controlsTargetRef.current) return;
        const time = state.clock.getElapsedTime();
        const targetRotX = controlsTargetRef.current.rotation.x;
        const targetRotY = controlsTargetRef.current.rotation.y;

        if (isMpfbRef.current) {
            // MPFB: offset from rest quaternion (bones have non-identity rest poses)
            // Clamp rotation to prevent neck-breaking at extremes
            const clampedRotX = THREE.MathUtils.clamp(targetRotX, -0.4, 0.4);
            const clampedRotY = THREE.MathUtils.clamp(targetRotY, -0.5, 0.5);

            if (headBoneRef.current) {
                _rot.current.setFromEuler(new THREE.Euler(clampedRotX * 0.8, clampedRotY * 0.8, 0));
                _q.current.copy(headRestQuat.current).multiply(_rot.current);
                headBoneRef.current.quaternion.slerp(_q.current, 0.12);
            }
            if (neckBoneRef.current) {
                _rot.current.setFromEuler(new THREE.Euler(clampedRotX * 0.25, clampedRotY * 0.3, 0));
                _q.current.copy(neckRestQuat.current).multiply(_rot.current);
                neckBoneRef.current.quaternion.slerp(_q.current, 0.12);
            }
            if (spineBoneRef.current) {
                const breathCycle = Math.sin(time * 0.8) * 0.5 + 0.5;
                _rot.current.setFromEuler(new THREE.Euler(breathCycle * 0.012, 0, 0));
                _q.current.copy(spineRestQuat.current).multiply(_rot.current);
                spineBoneRef.current.quaternion.slerp(_q.current, 0.12);
                spineBoneRef.current.position.y = breathCycle * 0.002;
            }
        } else {
            // Avaturn: identity rest poses, direct assignment works
            if (headBoneRef.current) {
                headBoneRef.current.rotation.x = targetRotX;
                headBoneRef.current.rotation.y = targetRotY;
            }
            if (neckBoneRef.current) {
                neckBoneRef.current.rotation.x = targetRotX * 0.35;
                neckBoneRef.current.rotation.y = targetRotY * 0.4;
            }
            if (spineBoneRef.current) {
                const breathCycle = Math.sin(time * 0.8) * 0.5 + 0.5;
                spineBoneRef.current.rotation.x = breathCycle * 0.012;
                spineBoneRef.current.position.y = breathCycle * 0.002;
            }
        }

        const currentScaleY = controlsTargetRef.current.scale.y;
        const jawAmount = Math.max(0, (currentScaleY - 1.0) * 5.0);

        const eyeGazeX = targetRotY * 0.6;
        const eyeGazeY = -targetRotX * 0.8;
        const driftX = Math.sin(time * 0.4 + 1.5) * 0.12 + Math.sin(time * 0.9 + 3.0) * 0.06 + Math.cos(time * 0.2) * 0.04;
        const driftY = Math.cos(time * 0.35 + 2.0) * 0.10 + Math.sin(time * 0.7 + 1.0) * 0.05;
        const saccadePhase = Math.floor(time * 0.4);
        const saccadeX = Math.sin(saccadePhase * 127.1) * 0.08;
        const saccadeY = Math.cos(saccadePhase * 311.7) * 0.06;
        const totalEyeX = eyeGazeX + driftX + saccadeX;
        const totalEyeY = eyeGazeY + driftY + saccadeY;

        if (isMpfbRef.current) {
            // MPFB bone-based facial animation
            if (jawBoneRef.current) {
                _rot.current.setFromAxisAngle(new THREE.Vector3(1, 0, 0), jawAmount * 0.25);
                _q.current.copy(jawRestQuat.current).multiply(_rot.current);
                jawBoneRef.current.quaternion.slerp(_q.current, 0.15);
            }
            if (eyeLBoneRef.current) {
                _rot.current.setFromEuler(new THREE.Euler(-totalEyeY * 0.25, totalEyeX * 0.3, 0));
                _q.current.copy(eyeLRestQuat.current).multiply(_rot.current);
                eyeLBoneRef.current.quaternion.slerp(_q.current, 0.15);
            }
            if (eyeRBoneRef.current) {
                _rot.current.setFromEuler(new THREE.Euler(-totalEyeY * 0.25, totalEyeX * 0.3, 0));
                _q.current.copy(eyeRRestQuat.current).multiply(_rot.current);
                eyeRBoneRef.current.quaternion.slerp(_q.current, 0.15);
            }
        } else {
            // Avaturn morph-target animation
            scene.traverse((obj) => {
                const mesh = obj as THREE.SkinnedMesh;
                if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
                const d = mesh.morphTargetDictionary;
                const i = mesh.morphTargetInfluences;
                const lb = d["eyeBlinkLeft"] ?? d["blink_left"];
                const rb = d["eyeBlinkRight"] ?? d["blink_right"];
                if (lb !== undefined) i[lb] = blinkState.current;
                if (rb !== undefined) i[rb] = blinkState.current;
                const jw = d["jawOpen"] ?? d["mouthOpen"];
                if (jw !== undefined) i[jw] = jawAmount;
                const mc = d["mouthClose"];
                if (mc !== undefined && jawAmount < 0.1) i[mc] = Math.max(0, Math.sin(time * 0.8 + 1.0) * 0.03);
                const ll = d["eyeLookOutLeft"] ?? d["eyesLookLeft"];
                const lr = d["eyeLookInLeft"] ?? d["eyesLookRight"];
                if (ll !== undefined && lr !== undefined) { i[ll] = totalEyeX > 0 ? Math.min(totalEyeX, 0.5) : 0; i[lr] = totalEyeX > 0 ? 0 : Math.min(-totalEyeX, 0.5); }
                const llr = d["eyeLookInRight"]; const lrr = d["eyeLookOutRight"];
                if (llr !== undefined && lrr !== undefined) { i[llr] = totalEyeX > 0 ? Math.min(totalEyeX, 0.5) : 0; i[lrr] = totalEyeX > 0 ? 0 : Math.min(-totalEyeX, 0.5); }
                const lu = d["eyeLookUpLeft"] ?? d["eyesLookUp"]; const ld = d["eyeLookDownLeft"] ?? d["eyesLookDown"];
                if (lu !== undefined && ld !== undefined) { i[lu] = totalEyeY > 0 ? Math.min(totalEyeY, 0.6) : 0; i[ld] = totalEyeY > 0 ? 0 : Math.min(-totalEyeY, 0.6); }
                const lur = d["eyeLookUpRight"]; const ldr = d["eyeLookDownRight"];
                if (lur !== undefined && ldr !== undefined) { i[lur] = totalEyeY > 0 ? Math.min(totalEyeY, 0.6) : 0; i[ldr] = totalEyeY > 0 ? 0 : Math.min(-totalEyeY, 0.6); }
            });
        }
    });

    return (
        <group>
            <mesh ref={controlsTargetRef} visible={false} />
            <Controls meshRef={controlsTargetRef} />
            <primitive object={scene} position={position} scale={scale} />
        </group>
    );
}

useGLTF.preload("/models/steve-v2.glb");
