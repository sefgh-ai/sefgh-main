"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Github,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Search,
  Code,
} from "lucide-react";

/**
 * Deterministic PRNG (mulberry32).
 *
 * The particle field called Math.random() 26 times inside useMemo. A memo is not
 * a purity guarantee — React may discard and recompute it — so those calls were
 * impure render-phase reads (react-hooks/purity) and made the scene differ
 * between server and client. Seeding makes the layout reproducible and pure.
 */
function createRandom(seed) {
  let t = seed;
  return function random() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const PARTICLE_SEED = 0x5e_f6_40;

export default function ParticleField() {
  const pointsRef = useRef();
  const linesRef = useRef();
  const dataStreamRef = useRef();
  const textGroupRef = useRef();
  const iconsGroupRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollVelocity = useRef(0);
  const scrollMomentum = useRef({ x: 0, y: 0, z: 0 });
  const specialIconRefs = useRef({});
  const iconRefs = useRef({});

  // GitHub/Dev jargon pool
  const jargonPool = useMemo(
    () => ["git", "code", "pull", "push", "commit", "fork", "clone", "search"],
    []
  );

  // Create neural network nodes (particles)
  const particleData = useMemo(() => {
    const random = createRandom(PARTICLE_SEED);
    const count = 150; // Reduced from 300 for better performance
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = [];
    const pulseOffsets = [];
    const textParticles = [];
    const iconParticles = [];

    // Sci-fi color palette - blue focused with subtle green
    const colorPalette = [
      [0.23, 0.51, 0.96], // Blue primary
      [0.34, 0.65, 1.0], // Blue light
      [0.06, 0.53, 0.9], // Blue darker
      [0.13, 0.82, 0.82], // Teal
      [0.06, 0.39, 0.31], // Darker green (subtle)
      [0.23, 0.51, 0.96], // Blue (repeat for higher frequency)
      [0.13, 0.82, 0.82], // Teal (repeat)
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Free random 3D space
      positions[i3] = (random() - 0.5) * 40;
      positions[i3 + 1] = (random() - 0.5) * 30;
      positions[i3 + 2] = -5 - random() * 30;

      // Random color
      const color =
        colorPalette[Math.floor(random() * colorPalette.length)];
      colors[i3] = color[0];
      colors[i3 + 1] = color[1];
      colors[i3 + 2] = color[2];

      // Variable sizes for depth
      sizes[i] = random() * 0.3 + 0.1;

      // Slow drift velocities
      velocities.push({
        x: (random() - 0.5) * 0.01,
        y: (random() - 0.5) * 0.015,
        z: (random() - 0.5) * 0.01,
      });

      // Random pulse timing
      pulseOffsets.push(random() * Math.PI * 2);

      // 50% chance to be a text particle
      if (random() < 0.5) {
        const rareRoll = random();
        let label = jargonPool[Math.floor(random() * jargonPool.length)];
        if (rareRoll < 0.008) label = "Adeel";
        else if (rareRoll < 0.016) label = "James";

        textParticles.push({
          index: i,
          text: label,
          position: [positions[i3], positions[i3 + 1], positions[i3 + 2]],
          rotation: [
            random() * Math.PI * 2,
            random() * Math.PI * 2,
            random() * Math.PI * 2,
          ],
          rotationSpeed: [
            (random() - 0.5) * 0.02,
            (random() - 0.5) * 0.02,
            (random() - 0.5) * 0.02,
          ],
          scale: random() * 0.4 + 0.4,
          special: label === "Adeel" || label === "James",
        });
      }
    }

    // Create icon particles that follow random nodes
    const iconTypes = ["github", "branch", "commit", "pr", "search", "code"];
    const iconsCount = 22;
    for (let k = 0; k < iconsCount; k++) {
      const pIndex = Math.floor(random() * count);
      const k3 = pIndex * 3;
      iconParticles.push({
        particleIndex: pIndex,
        type: iconTypes[Math.floor(random() * iconTypes.length)],
        color: ["#3b82f6", "#60a5fa", "#14b8a6", "#0ea5e9", "#0f766e"][
          Math.floor(random() * 5)
        ],
        size: random() * 14 + 14,
        offset: [
          (random() - 0.5) * 1.2,
          (random() - 0.5) * 1.2,
          (random() - 0.5) * 1.2,
        ],
        initial: [positions[k3], positions[k3 + 1], positions[k3 + 2]],
      });
    }

    return {
      positions,
      colors,
      sizes,
      velocities,
      pulseOffsets,
      textParticles,
      iconParticles,
      count,
    };
  }, [jargonPool]);

  // Mouse and scroll interaction with water physics
  useEffect(() => {
    const handleMouseMove = (event) => {
      mouseRef.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      };
    };

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      scrollVelocity.current = delta * 0.05;
      scrollMomentum.current.y += delta * 0.002;
      scrollMomentum.current.x += Math.sin(currentScrollY * 0.001) * 0.001;
      scrollMomentum.current.z += Math.cos(currentScrollY * 0.001) * 0.001;

      lastScrollY = currentScrollY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Create connection lines
  const lineGeometries = useMemo(() => {
    const geometries = [];
    const positions = particleData.positions;

    for (let i = 0; i < particleData.count; i += 12) {
      const i3 = i * 3;
      const x1 = positions[i3];
      const y1 = positions[i3 + 1];
      const z1 = positions[i3 + 2];

      for (let j = i + 12; j < Math.min(i + 40, particleData.count); j += 12) {
        const j3 = j * 3;
        const x2 = positions[j3];
        const y2 = positions[j3 + 1];
        const z2 = positions[j3 + 2];

        const dist = Math.sqrt(
          (x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2
        );

        if (dist < 4) {
          const points = [
            new THREE.Vector3(x1, y1, z1),
            new THREE.Vector3(x2, y2, z2),
          ];
          geometries.push({
            geometry: new THREE.BufferGeometry().setFromPoints(points),
            distance: dist,
          });
        }
      }
    }

    return geometries;
  }, [particleData]);

  // Animation with water physics
  useFrame(({ clock }) => {
    if (!pointsRef.current) return;

    const time = clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array;
    const sizes = pointsRef.current.geometry.attributes.size.array;

    // Apply scroll momentum decay
    scrollMomentum.current.x *= 0.95;
    scrollMomentum.current.y *= 0.95;
    scrollMomentum.current.z *= 0.95;
    scrollVelocity.current *= 0.92;

    // Animate particles with water-like physics
    for (let i = 0; i < particleData.count; i++) {
      const i3 = i * 3;
      const velocity = particleData.velocities[i];

      const waveX = Math.sin(time * 0.5 + particleData.pulseOffsets[i]) * 0.003;
      const waveY = Math.cos(time * 0.3 + i * 0.1) * 0.004;
      const waveZ = Math.sin(time * 0.4 + i * 0.05) * 0.003;

      const scrollInfluence = 1 + (i % 5) * 0.2;
      positions[i3] +=
        velocity.x + waveX + scrollMomentum.current.x * scrollInfluence;
      positions[i3 + 1] +=
        velocity.y + waveY + scrollMomentum.current.y * scrollInfluence;
      positions[i3 + 2] +=
        velocity.z + waveZ + scrollMomentum.current.z * scrollInfluence;

      if (Math.abs(scrollVelocity.current) > 0.01) {
        const ripple =
          Math.sin(time * 10 + i * 0.3) * scrollVelocity.current * 0.5;
        positions[i3 + 1] += ripple;
      }

      const dx = mouseRef.current.x * 5 - positions[i3];
      const dy = mouseRef.current.y * 5 - positions[i3 + 1];
      positions[i3] += dx * 0.0005;
      positions[i3 + 1] += dy * 0.0005;

      const pulse =
        Math.sin(time * 2 + particleData.pulseOffsets[i]) * 0.5 + 0.5;
      sizes[i] = particleData.sizes[i] * (1 + pulse * 0.5);

      const distance = Math.sqrt(
        positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
      );
      if (distance > 25) {
        positions[i3] *= 0.98;
        positions[i3 + 1] *= 0.98;
        positions[i3 + 2] *= 0.98;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.size.needsUpdate = true;

    pointsRef.current.rotation.y = time * 0.08 + scrollMomentum.current.x * 2;
    pointsRef.current.rotation.x =
      Math.sin(time * 0.05) * 0.15 + scrollMomentum.current.y;

    // Update text particles
    if (textGroupRef.current) {
      textGroupRef.current.children.forEach((textMesh, idx) => {
        const textData = particleData.textParticles[idx];
        if (textData) {
          const i3 = textData.index * 3;

          textMesh.position.set(
            positions[i3],
            positions[i3 + 1],
            positions[i3 + 2] + 0.5
          );

          textMesh.rotation.x +=
            textData.rotationSpeed[0] + scrollMomentum.current.y * 0.5;
          textMesh.rotation.y +=
            textData.rotationSpeed[1] + scrollMomentum.current.x * 0.5;
          textMesh.rotation.z +=
            textData.rotationSpeed[2] + scrollMomentum.current.z * 0.5;

          const pulse = Math.sin(time * 2 + textData.index) * 0.1 + 1;
          textMesh.scale.setScalar(textData.scale * pulse);
        }
      });

      textGroupRef.current.rotation.y =
        time * 0.08 + scrollMomentum.current.x * 2;
      textGroupRef.current.rotation.x =
        Math.sin(time * 0.05) * 0.15 + scrollMomentum.current.y;
    }

    // Update special side icons
    Object.keys(specialIconRefs.current).forEach((idxStr) => {
      const idx = Number(idxStr);
      const textData = particleData.textParticles[idx];
      if (!textData) return;
      const i3 = textData.index * 3;
      const obj = specialIconRefs.current[idx];
      if (obj && obj.position && typeof obj.position.set === "function") {
        obj.position.set(
          positions[i3] + 0.7,
          positions[i3 + 1] + 0.2,
          positions[i3 + 2] + 0.5
        );
      }
    });

    // Update floating GH icons
    Object.keys(iconRefs.current).forEach((iiStr) => {
      const ii = Number(iiStr);
      const iconData = particleData.iconParticles[ii];
      if (!iconData) return;
      const i3 = iconData.particleIndex * 3;
      const obj = iconRefs.current[ii];
      if (obj && obj.position && typeof obj.position.set === "function") {
        obj.position.set(
          positions[i3] + iconData.offset[0],
          positions[i3 + 1] + iconData.offset[1],
          positions[i3 + 2] + iconData.offset[2]
        );
      }
    });

    // Animate connection lines
    if (linesRef.current) {
      linesRef.current.children.forEach((line, idx) => {
        const material = line.material;
        const pulse = Math.sin(time * 3 + idx * 0.3) * 0.5 + 0.5;
        material.opacity = pulse * 0.3;
      });
      linesRef.current.rotation.y = time * 0.08 + scrollMomentum.current.x * 2;
      linesRef.current.rotation.x =
        Math.sin(time * 0.05) * 0.15 + scrollMomentum.current.y;
    }

    // Data stream effect
    if (dataStreamRef.current) {
      dataStreamRef.current.rotation.y = -time * 0.2;
    }
  });

  return (
    <>
      {/* Physics carrier points */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleData.count}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleData.count}
            array={particleData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleData.count}
            array={particleData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0}
          vertexColors={true}
          transparent={true}
          opacity={0}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Connection lines */}
      <group ref={linesRef}>
        {lineGeometries.map((item, idx) => (
          <line key={idx} geometry={item.geometry}>
            <lineBasicMaterial
              color="#3b82f6"
              transparent={true}
              opacity={0.15 * (1 - item.distance / 4)}
              blending={THREE.AdditiveBlending}
            />
          </line>
        ))}
      </group>

      {/* Floating text jargon */}
      <group ref={textGroupRef}>
        {particleData.textParticles.map((textData, idx) => (
          <group key={idx}>
            <Text
              position={textData.position}
              rotation={textData.rotation}
              scale={textData.scale}
              color={
                [
                  "#3b82f6",
                  "#60a5fa",
                  "#2563eb",
                  "#0ea5e9",
                  "#14b8a6",
                  "#0f766e",
                  "#3b82f6",
                ][idx % 7]
              }
              fontSize={1.0}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
              renderOrder={10}
              fontWeight="bold"
            >
              {textData.text}
            </Text>

            {textData.special && (
              <group
                ref={(g) => {
                  if (g) specialIconRefs.current[idx] = g;
                }}
              >
                <Html transform style={{ pointerEvents: "none" }}>
                  <div
                    style={{
                      color: textData.text === "Adeel" ? "#3b82f6" : "#14b8a6",
                      filter: "drop-shadow(0 0 6px rgba(59,130,246,0.7))",
                    }}
                  >
                    {textData.text === "Adeel" ? (
                      <Code size={16} />
                    ) : (
                      <Github size={16} />
                    )}
                  </div>
                </Html>
              </group>
            )}
          </group>
        ))}
      </group>

      {/* Floating GitHub-related icons */}
      <group ref={iconsGroupRef}>
        {particleData.iconParticles.map((ic, ii) => (
          <group
            key={ii}
            ref={(g) => {
              if (g) iconRefs.current[ii] = g;
            }}
          >
            <Html transform style={{ pointerEvents: "none" }}>
              <div
                style={{
                  color: ic.color,
                  filter: `drop-shadow(0 0 6px ${ic.color}aa)`,
                }}
              >
                {ic.type === "github" && <Github size={ic.size} />}
                {ic.type === "branch" && <GitBranch size={ic.size} />}
                {ic.type === "commit" && <GitCommit size={ic.size} />}
                {ic.type === "pr" && <GitPullRequest size={ic.size} />}
                {ic.type === "search" && <Search size={ic.size} />}
                {ic.type === "code" && <Code size={ic.size} />}
              </div>
            </Html>
          </group>
        ))}
      </group>

      {/* Outer data stream ring */}
      <group ref={dataStreamRef}>
        {[...Array(50)].map((_, i) => {
          const angle = (i / 50) * Math.PI * 2;
          const radius = 18;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * radius,
                Math.sin(i * 0.5) * 2,
                Math.sin(angle) * radius,
              ]}
            >
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial
                color={i % 7 === 0 ? "#0f766e" : "#3b82f6"}
                transparent={true}
                opacity={0.5}
              />
            </mesh>
          );
        })}
      </group>

      {/* Sci-fi lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#14b8a6" />
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#2563eb" />
      <pointLight position={[0, 15, 0]} intensity={0.5} color="#0ea5e9" />
    </>
  );
}
