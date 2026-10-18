"use client";

import React, { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  useTexture,
  Float,
  Environment,
  ContactShadows,
  Sparkles,
  Stars,
  Grid
} from "@react-three/drei";
import {
  Bot,
  Sparkles as SparklesIcon,
  Mic,
  Volume2,
  VolumeX,
  Send,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Upload,
  Sliders,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  User,
  Square,
  Search,
  Loader2
} from "lucide-react";
import { VERIFIED_CLOUD_MODELS } from "./ModelLibraryModal";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useGestureEngine, GestureEngineState } from "@/hooks/useGestureEngine";
import {
  saveCustomLessonToDB,
  loadCustomLessonFromDB,
  clearCustomLessonFromDB,
} from "@/utils/lessonStorage";
import * as THREE from "three";
import ModelLibraryModal, { CloudGlbAsset, SketchfabSearchResult } from "./ModelLibraryModal";

type StemModelId = "atom" | "dna" | "earth" | "custom";

export interface PropertyCard {
  id: string;
  code: string;
  name: string;
  metric: string;
  color: string;
  description: string;
  focusOffset?: [number, number, number];
}

interface ModelSpec {
  title: string;
  category: string;
  summary: string;
  properties: PropertyCard[];
}

class GlbErrorBoundary extends React.Component<
  { children: React.ReactNode; onErrorFallback: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onErrorFallback: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onErrorFallback();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const MODEL_SPECS: Record<StemModelId, ModelSpec> = {
  atom: {
    title: "Carbon-12 Atomic Structure",
    category: "QUANTUM PHYSICS • ATOMIC NUMBER 6",
    summary: "6 Protons, 6 Neutrons in dense femtometer nucleus surrounded by 6 quantized electrons.",
    properties: [
      {
        id: "zone-0",
        code: "P+",
        name: "Protons (6 Hadron Baryons)",
        metric: "+1e Charge • 1.672 × 10⁻²⁷ kg",
        color: "#f43f5e",
        description: "Positively charged subatomic particles composed of two Up quarks and one Down quark.",
        focusOffset: [0, 0, 0],
      },
      {
        id: "zone-1",
        code: "N0",
        name: "Neutrons (6 Neutral Baryons)",
        metric: "0 Charge • Strong Nuclear Force",
        color: "#a855f7",
        description: "Stabilizes the atomic nucleus by binding protons together against electrostatic repulsion.",
        focusOffset: [0, 0, 0],
      },
      {
        id: "zone-2",
        code: "K-SHELL",
        name: "1s² Inner Orbital Shell",
        metric: "2 Electrons • -13.6 eV Binding",
        color: "#38bdf8",
        description: "Lowest energy quantum shell closest to the nucleus holding 2 paired core electrons.",
        focusOffset: [0.6, 0.2, 0],
      },
      {
        id: "zone-3",
        code: "L-SHELL",
        name: "2s² 2p² Valence Shell",
        metric: "4 Valence e⁻ • Covalent Bonding",
        color: "#22d3ee",
        description: "Outer shell with 4 valence electrons allowing Carbon to form 4 stable covalent bonds.",
        focusOffset: [-0.8, 0.4, 0],
      },
    ],
  },
  dna: {
    title: "B-DNA Double Helix",
    category: "MOLECULAR BIOLOGY • GENOME ARCHITECTURE",
    summary: "Right-handed double-stranded biopolymer encoding genetic instructions via complementary base pairing.",
    properties: [
      {
        id: "zone-0",
        code: "PO₄",
        name: "Sugar-Phosphate Backbone",
        metric: "2.0 nm Diameter • Antiparallel (5'→3')",
        color: "#a855f7",
        description: "Deoxyribose sugars linked by phosphodiester bonds form the protective exterior structural rails.",
        focusOffset: [-0.7, 0.3, 0],
      },
      {
        id: "zone-1",
        code: "A = T",
        name: "Adenine — Thymine Base Pair",
        metric: "2 Hydrogen Bonds • Purine-Pyrimidine",
        color: "#f43f5e",
        description: "Bridges the helix interior with a dual hydrogen bond; unzips first during DNA replication.",
        focusOffset: [0, 0.6, 0],
      },
      {
        id: "zone-2",
        code: "G ≡ C",
        name: "Guanine — Cytosine Base Pair",
        metric: "3 Hydrogen Bonds • High Thermal Stability",
        color: "#10b981",
        description: "Triple hydrogen-bonded nucleotide pair providing strong torsional stability to the helix.",
        focusOffset: [0, -0.5, 0],
      },
      {
        id: "zone-3",
        code: "HELICASE",
        name: "Replication Fork Unzipping",
        metric: "0.34 nm Base Rise • 10.5 bp / Turn",
        color: "#38bdf8",
        description: "During cell division, Helicase cleaves the central hydrogen bonds to separate the two strands.",
        focusOffset: [0.6, -0.8, 0],
      },
    ],
  },
  earth: {
    title: "NASA Earth & Planetary Core",
    category: "ASTROPHYSICS & GEOPHYSICS • TERRA",
    summary: "2K NASA satellite surface & cloud biosphere with cutaway tectonic mantle, liquid dynamo, and solid inner core.",
    properties: [
      {
        id: "zone-0",
        code: "CRUST",
        name: "NASA Biosphere & Tectonic Crust",
        metric: "5 – 70 km Depth • 71% Liquid Hydrosphere",
        color: "#38bdf8",
        description: "Continental granite and oceanic basalt plates beneath a nitrogen-oxygen atmosphere and cloud deck.",
        focusOffset: [-0.75, 0.75, 0],
      },
      {
        id: "zone-1",
        code: "MANTLE",
        name: "Silicate Magma Asthenosphere",
        metric: "2,890 km Thick • 1,000°C to 3,700°C",
        color: "#ef4444",
        description: "Comprises 84% of Earth's volume; slow thermal convection currents drive continental drift.",
        focusOffset: [0, 0, 0],
      },
      {
        id: "zone-2",
        code: "DYNAMO",
        name: "Liquid Iron-Nickel Outer Core",
        metric: "2,260 km Shell • 4,500°C • Geodynamo",
        color: "#f97316",
        description: "Convecting liquid metal generates Earth's magnetic field, shielding the biosphere from solar wind.",
        focusOffset: [0.75, -0.35, 0],
      },
      {
        id: "zone-3",
        code: "CORE",
        name: "Solid Crystalline Inner Core",
        metric: "1,220 km Radius • 5,400°C • 360 GPa",
        color: "#facc15",
        description: "Crushing pressure locks superheated iron-nickel crystals into a dense solid sphere.",
        focusOffset: [1.45, -0.6, 0],
      },
    ],
  },
  custom: {
    title: "Custom 3D STEM Model",
    category: "TEACHER CUSTOM 3D LESSON (.GLB)",
    summary: "Interactive 3D model with custom teacher-defined part explanations and radial dissection.",
    properties: [],
  },
};

interface SlideStat {
  label: string;
  value: string;
}

interface SlideItem {
  tag: string;
  title: string;
  subtitle: string;
  bullets: string[];
  stats: SlideStat[];
  linkedModel?: StemModelId;
  formula?: string;
  imageUrl?: string;
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    tag: "CHAPTER 01 • QUANTUM PHYSICS",
    title: "Carbon-12 Atomic Architecture",
    subtitle: "How quantized electrons orbit a dense femtometer nucleus bound by the Strong Nuclear Force.",
    linkedModel: "atom",
    formula: "Eₙ = -13.6 Z² / n² eV",
    stats: [
      { label: "ATOMIC MASS", value: "12.011 u" },
      { label: "NUCLEUS RADIUS", value: "2.70 fm" },
      { label: "VALENCE SHELL", value: "4 Electrons" },
    ],
    bullets: [
      "6 Protons (+) and 6 Neutrons (0) bind tightly inside the central nucleus via the Strong Force.",
      "2 core electrons occupy the inner 1s² K-shell while 4 valence electrons orbit in the 2s²2p² L-shell.",
      "Make a CLOSED FIST at any time to expand the quantum shells in real time!",
    ],
  },
  {
    tag: "CHAPTER 02 • MOLECULAR BIOLOGY",
    title: "DNA Double Helix & Replication",
    subtitle: "Right-handed antiparallel biopolymer encoding the master genetic blueprint of cellular life.",
    linkedModel: "dna",
    formula: "A = T (2 H-Bonds)  •  G ≡ C (3 H-Bonds)",
    stats: [
      { label: "HELIX DIAMETER", value: "2.0 nm" },
      { label: "BASE PAIR RISE", value: "0.34 nm" },
      { label: "TURN PITCH", value: "10.5 bp" },
    ],
    bullets: [
      "Sugar-phosphate backbones run in antiparallel (5'→3') directions on the exterior of the helix.",
      "Adenine pairs strictly with Thymine (2 H-bonds); Guanine pairs with Cytosine (3 H-bonds).",
      "Close your FIST to simulate DNA Helicase cleaving the hydrogen bonds down the center!",
    ],
  },
  {
    tag: "CHAPTER 03 • PLANETARY GEOPHYSICS",
    title: "NASA Earth & Internal Geosphere",
    subtitle: "Four concentric thermodynamic and mechanical shells extending 6,371 km to the solid metallic core.",
    linkedModel: "earth",
    formula: "g = G·M / r² = 9.81 m/s²",
    stats: [
      { label: "CORE TEMP", value: "5,400 °C" },
      { label: "MANTLE VOLUME", value: "84% Vol" },
      { label: "CORE PRESSURE", value: "360 GPa" },
    ],
    bullets: [
      "Continental and oceanic tectonic plates float above the convecting 2,890 km silicate Mantle.",
      "Swirling liquid iron-nickel in the Outer Core generates Earth's protective magnetic field.",
      "Close your FIST to lift the Northern Tectonic Hemisphere and expose the glowing inner cores!",
    ],
  },
];

const TEACHER_PRESETS = [
  {
    label: "Human Heart Anatomy",
    title: "Human Cardiac Cycle & Chambers",
    category: "ANATOMY & PHYSIOLOGY • CARDIOLOGY",
    formula: "CO = HR × SV (5.0 L/min)",
    summary: "Four-chambered muscular pump circulating oxygenated blood through systemic and pulmonary loops.",
    stats: [
      { label: "STROKE VOLUME", value: "70 mL" },
      { label: "HEART RATE", value: "72 BPM" },
      { label: "OUTPUT", value: "5.0 L/min" },
    ],
    bullets: [
      "Deoxygenated blood enters the Right Atrium and pumps through the Right Ventricle to the lungs.",
      "Oxygen-rich blood returns to the Left Atrium and exits via the thick-walled Left Ventricle & Aorta.",
      "Make a CLOSED FIST to dissect the myocardium and inspect the internal valves!",
    ],
    partNames: [
      { name: "Aortic Arch & Ascending Aorta", metric: "High-Pressure Systemic Outlet • 120 mmHg", desc: "Largest artery distributing oxygenated blood from the Left Ventricle to the body." },
      { name: "Left Ventricle Myocardium", metric: "12–15 mm Muscular Wall • Primary Pump", desc: "Thickest cardiac chamber generating high systolic pressure for systemic circulation." },
      { name: "Right Atrium & Superior Vena Cava", metric: "Venous Return Chamber • 4–8 mmHg", desc: "Receives deoxygenated blood returning from the upper and lower systemic veins." },
      { name: "Pulmonary Artery & Valve Trunk", metric: "Pulmonary Loop • 25/10 mmHg", desc: "Routes deoxygenated blood from the Right Ventricle directly to the lungs for gas exchange." },
    ],
  },
  {
    label: "Aerodynamics & Chassis",
    title: "High-Downforce Aerodynamic Chassis",
    category: "MECHANICAL ENGINEERING • FLUID DYNAMICS",
    formula: "F_D = ½ ρ v² C_D A",
    summary: "Carbon-fiber monocoque and ground-effect aerodynamic surfaces engineered for maximum cornering downforce.",
    stats: [
      { label: "DOWNFORCE", value: "1,200 kg" },
      { label: "DRAG COEFF", value: "0.34 Cd" },
      { label: "CHASSIS", value: "Carbon CFRP" },
    ],
    bullets: [
      "Front splitter and canards direct high-velocity airflow into the underbody Venturi tunnels.",
      "Carbon-fiber monocoque safety cell absorbs high-G impact energy while maintaining torsional rigidity.",
      "Rear dual-element wing and diffuser create a low-pressure wake to plant the rear tires.",
    ],
    partNames: [
      { name: "Carbon-Fiber Monocoque & Canopy", metric: "Torsional Rigidity: 65,000 Nm/deg", desc: "Ultra-lightweight honeycomb composite safety cell protecting the cockpit." },
      { name: "Front Splitter & Aero Fairing", metric: "35% Front Downforce Balance", desc: "Splits oncoming stagnation air to pressurize the front axle and feed cooling ducts." },
      { name: "Rear Wing & Venturi Diffuser", metric: "Low-Pressure Vortex Generator", desc: "Accelerates underbody airflow to generate ground-effect suction without excess drag." },
      { name: "Forged Alloy Wheel & Pushrod Hub", metric: "Unsprung Mass Assembly • Carbon Ceramic", desc: "Transfers aerodynamic and mechanical grip loads to the contact patch." },
    ],
  },
  {
    label: "Computer Hardware & Peripherals",
    title: "Workstation Architecture & Optical Mouse",
    category: "COMPUTER ENGINEERING • HARDWARE SYSTEMS",
    formula: "P = C · V² · f",
    summary: "Integrated computing system combining CPU/GPU silicon processing with optical DSP input sensors.",
    stats: [
      { label: "CLOCK SPEED", value: "4.6 GHz" },
      { label: "OPTICAL DPI", value: "16,000 DPI" },
      { label: "BUS BANDWIDTH", value: "64 GB/s" },
    ],
    bullets: [
      "The motherboard routes high-speed PCIe lanes between the CPU, RAM, and NVMe storage.",
      "The optical mouse uses an infrared LED and CMOS sensor to track surface micro-textures at 1,000 Hz.",
      "Make a CLOSED FIST to separate the outer chassis and inspect the internal PCB and optical sensor!",
    ],
    partNames: [
      { name: "High-Resolution Display Panel & Hinges", metric: "IPS / OLED Matrix • 120Hz Refresh", desc: "Renders visual framebuffers output by the dedicated graphics processing unit." },
      { name: "Main Logic Board (CPU / GPU / Cooling)", metric: "Multi-Layer Copper PCB • Vapor Chamber", desc: "Houses the microprocessor, memory controllers, and thermal dissipation pipes." },
      { name: "Tactile Keyboard & Chassis Deck", metric: "Scissor-Switch Matrix • Aluminum Unibody", desc: "Provides structural rigidity, battery enclosure, and low-latency key actuation." },
      { name: "Optical Mouse Sensor & Micro-Switches", metric: "CMOS Optical DSP • Scroll Encoder", desc: "Captures surface displacement frames to translate physical hand motion into X/Y vectors." },
    ],
  },
];

// =========================================================
// 1. CARBON-12 ATOM
// =========================================================
function AtomModel({
  explodeFactor,
  selectedPartId,
}: {
  explodeFactor: React.MutableRefObject<number>;
  selectedPartId: string | null;
}) {
  const shellKRef = useRef<THREE.Group>(null);
  const shellL1Ref = useRef<THREE.Group>(null);
  const shellL2Ref = useRef<THREE.Group>(null);
  const nucleonsRef = useRef<THREE.Group>(null);
  const coreGlowRef = useRef<THREE.Mesh>(null);

  const nucleons = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 12);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 0.24;
      return {
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        isProton: i % 2 === 0,
      };
    });
  }, []);

  useFrame((state, delta) => {
    const exp = explodeFactor.current;
    const t = state.clock.elapsedTime;

    if (shellKRef.current) {
      shellKRef.current.rotation.z += delta * 1.8;
      shellKRef.current.scale.setScalar(1 + exp * 0.35);
    }
    if (shellL1Ref.current) {
      shellL1Ref.current.rotation.z -= delta * 1.25;
      shellL1Ref.current.scale.setScalar(1 + exp * 0.65);
    }
    if (shellL2Ref.current) {
      shellL2Ref.current.rotation.z += delta * 1.4;
      shellL2Ref.current.scale.setScalar(1 + exp * 0.85);
    }
    if (nucleonsRef.current) {
      nucleonsRef.current.rotation.y += delta * 0.5;
      nucleonsRef.current.children.forEach((child, i) => {
        const base = nucleons[i].pos;
        const spread = 1 + exp * 2.5;
        child.position.set(base.x * spread, base.y * spread, base.z * spread);
      });
    }
    if (coreGlowRef.current) {
      coreGlowRef.current.scale.setScalar(0.52 + Math.sin(t * 4) * 0.04 + exp * 0.45);
    }
  });

  const dimIfOther = (zoneId: string) =>
    selectedPartId && selectedPartId !== zoneId ? 0.18 : 1.0;

  return (
    <group>
      <Sparkles count={45} scale={3.6} size={2} speed={0.5} color="#a855f7" />
      <mesh ref={coreGlowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial
          color="#ec4899"
          emissive="#a855f7"
          emissiveIntensity={0.8}
          transparent
          opacity={0.15}
          roughness={0.1}
        />
      </mesh>
      <group ref={nucleonsRef}>
        {nucleons.map((n, idx) => {
          const zId = n.isProton ? "zone-0" : "zone-1";
          return (
            <mesh key={idx} position={n.pos}>
              <sphereGeometry args={[0.17, 32, 32]} />
              <meshPhysicalMaterial
                color={n.isProton ? "#f43f5e" : "#8b5cf6"}
                emissive={n.isProton ? "#e11d48" : "#6d28d9"}
                emissiveIntensity={selectedPartId === zId ? 1.2 : 0.45}
                roughness={0.15}
                metalness={0.3}
                clearcoat={1}
                transparent
                opacity={dimIfOther(zId)}
              />
            </mesh>
          );
        })}
      </group>
      <group rotation={[0.5, 0.2, 0]}>
        <group ref={shellKRef}>
          <mesh>
            <torusGeometry args={[1.05, 0.015, 24, 120]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={selectedPartId === "zone-2" ? 2.0 : 0.8}
              transparent
              opacity={dimIfOther("zone-2")}
            />
          </mesh>
          {[0, Math.PI].map((ang, i) => (
            <mesh key={i} position={[Math.cos(ang) * 1.05, Math.sin(ang) * 1.05, 0]}>
              <sphereGeometry args={[0.085, 24, 24]} />
              <meshStandardMaterial
                color="#e0f2fe"
                emissive="#38bdf8"
                emissiveIntensity={2}
                transparent
                opacity={dimIfOther("zone-2")}
              />
            </mesh>
          ))}
        </group>
      </group>
      <group rotation={[-0.7, 0.5, 0.4]}>
        <group ref={shellL1Ref}>
          <mesh>
            <torusGeometry args={[1.55, 0.015, 24, 120]} />
            <meshStandardMaterial
              color="#a855f7"
              emissive="#a855f7"
              emissiveIntensity={selectedPartId === "zone-3" ? 2.0 : 0.8}
              transparent
              opacity={dimIfOther("zone-3")}
            />
          </mesh>
          {[0, Math.PI].map((ang, i) => (
            <mesh key={i} position={[Math.cos(ang) * 1.55, Math.sin(ang) * 1.55, 0]}>
              <sphereGeometry args={[0.09, 24, 24]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#22d3ee"
                emissiveIntensity={2}
                transparent
                opacity={dimIfOther("zone-3")}
              />
            </mesh>
          ))}
        </group>
      </group>
      <group rotation={[0.7, -0.6, -0.3]}>
        <group ref={shellL2Ref}>
          <mesh>
            <torusGeometry args={[1.55, 0.015, 24, 120]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={selectedPartId === "zone-3" ? 2.0 : 0.8}
              transparent
              opacity={dimIfOther("zone-3")}
            />
          </mesh>
          {[Math.PI / 2, (3 * Math.PI) / 2].map((ang, i) => (
            <mesh key={i} position={[Math.cos(ang) * 1.55, Math.sin(ang) * 1.55, 0]}>
              <sphereGeometry args={[0.09, 24, 24]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#22d3ee"
                emissiveIntensity={2}
                transparent
                opacity={dimIfOther("zone-3")}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// =========================================================
// 2. DNA DOUBLE HELIX
// =========================================================
function DnaModel({
  explodeFactor,
  selectedPartId,
}: {
  explodeFactor: React.MutableRefObject<number>;
  selectedPartId: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const numPairs = 26;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.35;
    const exp = explodeFactor.current;

    groupRef.current.children.forEach((pairGroup, i) => {
      const strandProgress = Math.max(0, 1 - (i / numPairs) * 0.35);
      const unzipOffset = exp * 0.95 * strandProgress;

      const leftPhosphate = pairGroup.children[0];
      const rightPhosphate = pairGroup.children[1];
      const leftNucleotide = pairGroup.children[2];
      const rightNucleotide = pairGroup.children[3];
      const hBond = pairGroup.children[4] as THREE.Mesh;

      leftPhosphate.position.x = -0.78 - unzipOffset;
      rightPhosphate.position.x = 0.78 + unzipOffset;
      leftNucleotide.position.x = -0.38 - unzipOffset;
      rightNucleotide.position.x = 0.38 + unzipOffset;

      if (hBond) {
        hBond.scale.y = Math.max(0.01, 1 - exp * 1.3);
        (hBond.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 - exp);
      }
    });
  });

  const backboneOpacity = selectedPartId && selectedPartId !== "zone-0" ? 0.22 : 1.0;

  return (
    <group ref={groupRef}>
      {Array.from({ length: numPairs }, (_, i) => {
        const y = (i - numPairs / 2) * 0.175;
        const twist = i * 0.38;
        const isAT = i % 2 === 0;
        const pairZone = isAT ? "zone-1" : "zone-2";
        const pairOpacity =
          selectedPartId && selectedPartId !== pairZone && selectedPartId !== "zone-3" ? 0.2 : 1.0;

        return (
          <group key={i} position={[0, y, 0]} rotation={[0, twist, 0]}>
            <group position={[-0.78, 0, 0]}>
              <mesh>
                <sphereGeometry args={[0.11, 24, 24]} />
                <meshPhysicalMaterial
                  color="#a855f7"
                  emissive="#7e22ce"
                  emissiveIntensity={0.35}
                  roughness={0.15}
                  metalness={0.4}
                  clearcoat={1}
                  transparent
                  opacity={backboneOpacity}
                />
              </mesh>
              <mesh position={[0, 0.09, 0.12]} rotation={[0.8, 0, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.28, 12]} />
                <meshStandardMaterial
                  color="#c084fc"
                  metalness={0.5}
                  roughness={0.2}
                  transparent
                  opacity={backboneOpacity}
                />
              </mesh>
            </group>
            <group position={[0.78, 0, 0]}>
              <mesh>
                <sphereGeometry args={[0.11, 24, 24]} />
                <meshPhysicalMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={0.35}
                  roughness={0.15}
                  metalness={0.4}
                  clearcoat={1}
                  transparent
                  opacity={backboneOpacity}
                />
              </mesh>
              <mesh position={[0, 0.09, -0.12]} rotation={[-0.8, 0, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.28, 12]} />
                <meshStandardMaterial
                  color="#7dd3fc"
                  metalness={0.5}
                  roughness={0.2}
                  transparent
                  opacity={backboneOpacity}
                />
              </mesh>
            </group>
            <mesh position={[-0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.68, 16]} />
              <meshPhysicalMaterial
                color={isAT ? "#f43f5e" : "#10b981"}
                roughness={0.2}
                clearcoat={0.8}
                transparent
                opacity={pairOpacity}
              />
            </mesh>
            <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.68, 16]} />
              <meshPhysicalMaterial
                color={isAT ? "#fbbf24" : "#38bdf8"}
                roughness={0.2}
                clearcoat={0.8}
                transparent
                opacity={pairOpacity}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// =========================================================
// 3. PHOTOREALISTIC 2K NASA EARTH
// =========================================================
function PhotorealisticEarthModel({
  explodeFactor,
  selectedPartId,
  onSelectPart,
}: {
  explodeFactor: React.MutableRefObject<number>;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
}) {
  const [colorMap, normalMap, specularMap, cloudsMap, moonMap] = useTexture([
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png",
    "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg",
  ]);

  const upperHemisphereRef = useRef<THREE.Group>(null);
  const lowerHemisphereRef = useRef<THREE.Group>(null);
  const mantleRef = useRef<THREE.Mesh>(null);
  const outerCoreRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const exp = explodeFactor.current;

    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.05;
    if (moonOrbitRef.current) moonOrbitRef.current.rotation.y += delta * 0.25;

    if (upperHemisphereRef.current) {
      upperHemisphereRef.current.position.set(-exp * 0.75, exp * 0.75, 0);
      upperHemisphereRef.current.rotation.z = exp * 0.22;
    }
    if (lowerHemisphereRef.current) {
      lowerHemisphereRef.current.position.set(-exp * 0.35, -exp * 0.25, 0);
    }
    if (mantleRef.current) {
      mantleRef.current.position.set(0, 0, 0);
    }
    if (outerCoreRef.current) {
      outerCoreRef.current.position.set(exp * 0.75, -exp * 0.35, exp * 0.25);
    }
    if (innerCoreRef.current) {
      innerCoreRef.current.position.set(exp * 1.45, -exp * 0.6, exp * 0.45);
    }
  });

  const layerOpacity = (partId: string) =>
    selectedPartId && selectedPartId !== partId ? 0.15 : 1.0;

  return (
    <group>
      <mesh
        ref={innerCoreRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart("zone-3");
        }}
      >
        <sphereGeometry args={[0.45, 64, 64]} />
        <meshPhysicalMaterial
          color="#fef08a"
          emissive="#f59e0b"
          emissiveIntensity={selectedPartId === "zone-3" ? 2.5 : 1.8}
          roughness={0.1}
          metalness={0.7}
          transparent
          opacity={layerOpacity("zone-3")}
        />
      </mesh>
      <mesh
        ref={outerCoreRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart("zone-2");
        }}
      >
        <sphereGeometry args={[0.82, 64, 64]} />
        <meshPhysicalMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={selectedPartId === "zone-2" ? 1.4 : 0.75}
          roughness={0.25}
          metalness={0.3}
          clearcoat={0.6}
          transparent
          opacity={layerOpacity("zone-2")}
        />
      </mesh>
      <mesh
        ref={mantleRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart("zone-1");
        }}
      >
        <sphereGeometry args={[1.18, 64, 64]} />
        <meshPhysicalMaterial
          color="#b91c1c"
          emissive="#dc2626"
          emissiveIntensity={selectedPartId === "zone-1" ? 1.1 : 0.5}
          roughness={0.4}
          clearcoat={0.4}
          transparent
          opacity={layerOpacity("zone-1")}
        />
      </mesh>

      <group
        ref={upperHemisphereRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart("zone-0");
        }}
      >
        <mesh>
          <sphereGeometry args={[1.42, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={specularMap}
            roughness={0.55}
            metalness={0.1}
            transparent
            opacity={layerOpacity("zone-0")}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.18, 1.42, 64]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.4}
            side={THREE.DoubleSide}
            transparent
            opacity={layerOpacity("zone-0")}
          />
        </mesh>
      </group>

      <group
        ref={lowerHemisphereRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPart("zone-0");
        }}
      >
        <mesh>
          <sphereGeometry args={[1.42, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            roughnessMap={specularMap}
            roughness={0.55}
            metalness={0.1}
            transparent
            opacity={layerOpacity("zone-0")}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.18, 1.42, 64]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#ea580c"
            emissiveIntensity={0.4}
            side={THREE.DoubleSide}
            transparent
            opacity={layerOpacity("zone-0")}
          />
        </mesh>
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[1.445, 64, 64]} />
          <meshStandardMaterial
            map={cloudsMap}
            transparent
            opacity={selectedPartId && selectedPartId !== "zone-0" ? 0.05 : 0.42}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={moonOrbitRef} rotation={[0.25, 0, 0.15]}>
        <mesh position={[2.35, 0, 0]}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial map={moonMap} roughness={0.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.35, 0.005, 16, 120]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================
// 4. LOCAL UPLOADED .GLB MODEL INSPECTOR & RADIAL DISSECTOR
// =========================================================
interface ExplodablePart {
  id: string;
  mesh: THREE.Mesh;
  semanticName: string;
  spatialZone: string;
  originalLocalPos: THREE.Vector3;
  explodeDirLocal: THREE.Vector3;
  worldFocusCenter: [number, number, number];
  verts: number;
  tris: number;
  clonedMaterial: THREE.Material | THREE.Material[];
}

function extractMeaningfulPartName(mesh: THREE.Mesh, spatialZone: string, index: number): string {
  const cleanString = (raw: string) =>
    raw
      .replace(/[_.-]+/g, " ")
      .replace(
        /\b(mesh|node|object|geo|primitive|shape|id|poly|default|mat|material|sg|shader|group|root|scene)\b/gi,
        ""
      )
      .replace(/\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();

  let curr: THREE.Object3D | null = mesh;
  while (curr) {
    const candidate = cleanString(curr.name);
    if (candidate.length >= 3 && /[a-zA-Z]{3,}/.test(candidate)) {
      return candidate.slice(0, 26);
    }
    curr = curr.parent;
  }

  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (mat && mat.name) {
    const candidateMat = cleanString(mat.name);
    if (candidateMat.length >= 3 && /[a-zA-Z]{3,}/.test(candidateMat)) {
      return candidateMat.slice(0, 26);
    }
  }

  return `${spatialZone} Component #${index + 1}`;
}

function UploadedGlbModel({
  url,
  explodeFactor,
  engineState,
  selectedPartId,
  onSelectPart,
  onExtractedSpecs,
}: {
  url: string;
  explodeFactor: React.MutableRefObject<number>;
  engineState: React.MutableRefObject<GestureEngineState>;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  onExtractedSpecs: (cards: PropertyCard[]) => void;
}) {
  const { scene } = useGLTF(url, "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const { wrapperGroup, parts, propertyCards } = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);

    const outerBox = new THREE.Box3().setFromObject(cloned);
    const modelSize = new THREE.Vector3();
    const modelCenter = new THREE.Vector3();
    outerBox.getSize(modelSize);
    outerBox.getCenter(modelCenter);

    const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z, 0.001);
    const normScale = 2.6 / maxDim;

    cloned.position.sub(modelCenter);

    const container = new THREE.Group();
    container.scale.setScalar(normScale);
    container.add(cloned);
    container.updateMatrixWorld(true);

    const meshList: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshList.push(obj as THREE.Mesh);
      }
    });

    const extractedParts: ExplodablePart[] = [];

    meshList.forEach((mesh, index) => {
      const clonedMat = Array.isArray(mesh.material)
        ? mesh.material.map((m) => m.clone())
        : mesh.material
          ? mesh.material.clone()
          : new THREE.MeshStandardMaterial({ color: "#a855f7" });
      mesh.material = clonedMat;

      const geom = mesh.geometry;
      const verts = geom?.attributes?.position?.count || 0;
      const tris = geom?.index ? Math.round(geom.index.count / 3) : Math.round(verts / 3);

      const meshBox = new THREE.Box3().setFromObject(mesh);
      const meshWorldCenter = new THREE.Vector3();
      meshBox.getCenter(meshWorldCenter);

      const vertZone =
        meshWorldCenter.y > 0.25 ? "Upper" : meshWorldCenter.y < -0.25 ? "Lower" : "Central";
      const depthZone =
        meshWorldCenter.z > 0.3 ? "Front" : meshWorldCenter.z < -0.3 ? "Rear" : "";
      const sideZone =
        meshWorldCenter.x > 0.3 ? "Right" : meshWorldCenter.x < -0.3 ? "Left" : "Core";
      const spatialZone = `${vertZone} ${depthZone || sideZone}`.trim();

      const semanticName = extractMeaningfulPartName(mesh, spatialZone, index);
      const partId = `custom-part-${index}`;
      mesh.userData.partId = partId;

      let dirWorld = meshWorldCenter.clone();
      if (dirWorld.length() < 0.02) {
        const angle = (index / Math.max(meshList.length, 1)) * Math.PI * 2;
        dirWorld.set(Math.cos(angle), ((index % 3) - 1) * 0.45, Math.sin(angle));
      }
      dirWorld.normalize();

      const dirLocal = dirWorld.clone();
      if (mesh.parent) {
        const parentQuat = new THREE.Quaternion();
        mesh.parent.getWorldQuaternion(parentQuat);
        dirLocal.applyQuaternion(parentQuat.invert());
      }

      const explodeMagnitude = (maxDim * 0.48) / Math.max(mesh.parent?.scale.x || 1, 0.001);

      extractedParts.push({
        id: partId,
        mesh,
        semanticName,
        spatialZone,
        originalLocalPos: mesh.position.clone(),
        explodeDirLocal: dirLocal.multiplyScalar(explodeMagnitude),
        worldFocusCenter: [meshWorldCenter.x, meshWorldCenter.y, meshWorldCenter.z],
        verts,
        tris,
        clonedMaterial: clonedMat,
      });
    });

    const sortedParts = [...extractedParts].sort((a, b) => b.verts - a.verts).slice(0, 6);
    const palette = ["#22d3ee", "#a855f7", "#f43f5e", "#10b981", "#fbbf24", "#38bdf8"];

    const cards: PropertyCard[] = sortedParts.map((p, idx) => ({
      id: p.id,
      code: `PART 0${idx + 1}`,
      name: p.semanticName,
      metric: `${p.spatialZone} • ${p.verts.toLocaleString()} Verts`,
      color: palette[idx % palette.length],
      description: `Individual sub-mesh component (${p.tris.toLocaleString()} triangles). Hover or pinch to isolate and explain this part!`,
      focusOffset: p.worldFocusCenter,
    }));

    return { wrapperGroup: container, parts: extractedParts, propertyCards: cards };
  }, [scene]);

  useEffect(() => {
    onExtractedSpecs(propertyCards);
  }, [propertyCards, onExtractedSpecs]);

  useFrame(() => {
    const exp = explodeFactor.current;
    const state = engineState.current;

    if (state.justPinched3D) {
      state.justPinched3D = false;
      raycaster.setFromCamera(new THREE.Vector2(state.ndcX, state.ndcY), camera);
      const intersects = raycaster.intersectObjects(
        parts.map((p) => p.mesh),
        true
      );

      let hitPartId: string | null = null;
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.partId && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        hitPartId = hitObj?.userData?.partId || null;
      }

      if (hitPartId) {
        onSelectPart(hitPartId);
      }
    }

    if (parts.length > 1) {
      parts.forEach((part) => {
        const isSelected = selectedPartId === part.id;
        const partExplode = selectedPartId ? (isSelected ? 0 : exp * 1.25) : exp;

        part.mesh.position.lerpVectors(
          part.originalLocalPos,
          part.originalLocalPos.clone().add(part.explodeDirLocal),
          partExplode
        );

        const mats = Array.isArray(part.clonedMaterial) ? part.clonedMaterial : [part.clonedMaterial];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (selectedPartId) {
            std.transparent = !isSelected;
            std.opacity = isSelected ? 1.0 : 0.12;
            std.depthWrite = isSelected;
            if (std.emissive) {
              std.emissive.setHex(isSelected ? 0x06b6d4 : 0x000000);
              std.emissiveIntensity = isSelected ? 0.6 : 0;
            }
          } else {
            std.transparent = false;
            std.opacity = 1.0;
            std.depthWrite = true;
            if (std.emissive) std.emissiveIntensity = 0;
          }
        });
      });
    } else if (parts.length === 1) {
      const singlePart = parts[0];
      const mats = Array.isArray(singlePart.clonedMaterial)
        ? singlePart.clonedMaterial
        : [singlePart.clonedMaterial];
      mats.forEach((m) => {
        const stdMat = m as THREE.MeshStandardMaterial;
        stdMat.wireframe = exp > 0.35;
      });
    }
  });

  return (
    <primitive
      object={wrapperGroup}
      onClick={(e: any) => {
        e.stopPropagation();
        let hitObj: THREE.Object3D | null = e.object;
        while (hitObj && !hitObj.userData?.partId && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        const hitPartId = hitObj?.userData?.partId;
        if (hitPartId) onSelectPart(hitPartId);
      }}
    />
  );
}


// =========================================================
// MASTER 3D CONTROLLER WRAPPER
// =========================================================
function GestureControlledStage({ engineState, activeModel, customGlbUrl, manualDissect, selectedPartId, isEmbeddedInSlide, onSelectPart, onExtractedCustomSpecs, onGlbError }: any) {
  const groupRef = useRef<THREE.Group>(null); 
  const explodeFactor = useRef<number>(0);
  
  // 🎥 Cinematic Intro Animation Ref
  const introFactor = useRef<number>(0);

  // Jab bhi naya model load ho, intro animation ko 0 par reset karein
  useEffect(() => {
    introFactor.current = 0;
  }, [activeModel, customGlbUrl]);

  useFrame((_, delta) => {
    if (!groupRef.current) return; 
    const s = engineState.current;

    // 🚀 Smoothly animate intro from 0 to 1
    introFactor.current = THREE.MathUtils.damp(introFactor.current, 1, 4.5, delta);
    
    // Scale multiplier aur 360-degree spin calculate karein
    const introScale = introFactor.current;
    const introSpin = (1 - introFactor.current) * (Math.PI * 2); // 360° Spin

    if (isEmbeddedInSlide) {
      groupRef.current.position.lerp(new THREE.Vector3(1.62, 0.04, 0), delta * 8);
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, 0.72 * introScale, 8, delta));
      s.rotationY += delta * 0.25;
      groupRef.current.rotation.set(
        THREE.MathUtils.damp(groupRef.current.rotation.x, 0.2, 8, delta), 
        THREE.MathUtils.damp(groupRef.current.rotation.y, s.rotationY + introSpin, 8, delta), 
        0
      );
    } else {
      groupRef.current.rotation.set(
        THREE.MathUtils.damp(groupRef.current.rotation.x, s.rotationX, 10, delta), 
        THREE.MathUtils.damp(groupRef.current.rotation.y, s.rotationY + introSpin, 10, delta), 
        0
      );
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(groupRef.current.scale.x, s.scale * introScale, 10, delta));
      groupRef.current.position.lerp(new THREE.Vector3(s.panX, s.panY, 0), delta * 8);
    }
    
    explodeFactor.current = THREE.MathUtils.damp(explodeFactor.current, (s.isFist || manualDissect) ? 1 : 0, 7, delta);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
      <group ref={groupRef}>
        {activeModel === "atom" && <AtomModel explodeFactor={explodeFactor} selectedPartId={selectedPartId} />}
        {activeModel === "dna" && <DnaModel explodeFactor={explodeFactor} selectedPartId={selectedPartId} />}
        {activeModel === "earth" && <Suspense fallback={null}><PhotorealisticEarthModel explodeFactor={explodeFactor} selectedPartId={selectedPartId} onSelectPart={onSelectPart} /></Suspense>}
        {activeModel === "custom" && customGlbUrl && (
          <GlbErrorBoundary key={customGlbUrl} onErrorFallback={onGlbError}>
            <Suspense fallback={null}><UploadedGlbModel url={customGlbUrl} explodeFactor={explodeFactor} engineState={engineState} selectedPartId={selectedPartId} onSelectPart={onSelectPart} onExtractedSpecs={onExtractedCustomSpecs} /></Suspense>
          </GlbErrorBoundary>
        )}
      </group>
    </Float>
  );
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export default function SpatialStage() {
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const rawGlbBlobRef = useRef<Blob | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Model Library Modal States
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");

  const [mode, setMode] = useState<"2D" | "3D">("2D");
  const [activeModel, setActiveModel] = useState<StemModelId>("atom");
  const [customGlbUrl, setCustomGlbUrl] = useState<string | null>(null);
  const [customModelName, setCustomModelName] = useState<string>("Custom 3D Model");
  const [customCategory, setCustomCategory] = useState<string>("TEACHER CUSTOM 3D LESSON");
  const [customSummary, setCustomSummary] = useState<string>(
    "Interactive 3D model with custom teacher-defined part explanations and radial dissection."
  );
  const [customProperties, setCustomProperties] = useState<PropertyCard[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isSavedInBrowser, setIsSavedInBrowser] = useState(false);

  // Teacher Lesson Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [draftFormula, setDraftFormula] = useState("F = m · a  •  P = W / Δt");
  const [draftStats, setDraftStats] = useState<SlideStat[]>([
    { label: "KEY METRIC 1", value: "100%" },
    { label: "KEY METRIC 2", value: "360°" },
    { label: "KEY METRIC 3", value: "Active" },
  ]);
  const [draftBullets, setDraftBullets] = useState<string[]>([
    "Primary structural assembly engineered for high efficiency and stability.",
    "Internal sub-components work in concert to transfer energy across the system.",
    "Make a CLOSED FIST to radially dissect the model and inspect each part!",
  ]);

  // Spatial AI Co-Pilot State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [voiceReadout, setVoiceReadout] = useState(true);
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  const voiceReadoutRef = useRef(true);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Spatial AI Co-Pilot online. Ask me any question about the active 3D model, internal components, or scientific principles.",
    },
  ]);

  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [manualDissect, setManualDissect] = useState(false);

  const modelOrder: StemModelId[] = customGlbUrl
    ? ["atom", "dna", "earth", "custom"]
    : ["atom", "dna", "earth"];

  const {
    videoRef,
    skeletonCanvasRef,
    cursorDomRef,
    dwellRingRef,
    engineState,
    activeGestureLabel,
    isDissecting,
  } = useGestureEngine({
    smoothing: 0.28,
  });

  const isValidGlbBinary = async (blob: Blob): Promise<boolean> => {
    if (!blob || blob.size < 20) return false;
    try {
      const headerBuffer = await blob.slice(0, 4).arrayBuffer();
      const magic = new TextDecoder().decode(headerBuffer);
      return magic === "glTF";
    } catch {
      return false;
    }
  };

  const stopSpeakingImmediately = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingNow(false);
  };

  const toggleVoiceMute = () => {
    setVoiceReadout((prev) => {
      const nextVal = !prev;
      voiceReadoutRef.current = nextVal;
      if (!nextVal) {
        stopSpeakingImmediately();
      }
      return nextVal;
    });
  };

  const speakTextAloud = (text: string) => {
    if (!voiceReadoutRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\*/g, ""));
    utter.rate = 1.04;
    utter.onstart = () => setIsSpeakingNow(true);
    utter.onend = () => setIsSpeakingNow(false);
    utter.onerror = () => setIsSpeakingNow(false);
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isAiLoading]);

  useEffect(() => {
    loadCustomLessonFromDB().then(async (saved) => {
      if (saved && saved.glbBlob) {
        const valid = await isValidGlbBinary(saved.glbBlob);
        if (!valid) {
          await clearCustomLessonFromDB();
          return;
        }
        rawGlbBlobRef.current = saved.glbBlob;
        const restoredUrl = URL.createObjectURL(saved.glbBlob);
        setCustomGlbUrl(restoredUrl);
        setCustomModelName(saved.modelName);
        setCustomCategory(saved.category);
        setCustomSummary(saved.summary);
        setDraftFormula(saved.formula);
        setDraftStats(saved.stats);
        setDraftBullets(saved.bullets);
        setCustomProperties(saved.properties);
        setIsSavedInBrowser(true);

        const restoredSlide: SlideItem = {
          tag: saved.category,
          title: saved.modelName,
          subtitle: saved.summary,
          linkedModel: "custom",
          formula: saved.formula,
          stats: saved.stats,
          bullets: saved.bullets,
        };
        setSlides([...DEFAULT_SLIDES, restoredSlide]);
      }
    });
  }, []);

  const currentSlide = slides[slideIndex] || slides[0];

  const displayedModel: StemModelId =
    mode === "2D" && currentSlide.linkedModel ? currentSlide.linkedModel : activeModel;

  const currentSpec: ModelSpec =
    displayedModel === "custom"
      ? {
        title: customModelName,
        category: customCategory,
        summary: customSummary,
        properties: customProperties,
      }
      : MODEL_SPECS[displayedModel];

  const activePartCard = currentSpec.properties.find((p) => p.id === selectedPartId) || null;

  const resetView = () => {
    engineState.current.rotationX = 0.2;
    engineState.current.rotationY = -0.4;
    engineState.current.scale = 1;
    engineState.current.panX = 0;
    engineState.current.panY = 0;
    setSelectedPartId(null);
    setManualDissect(false);
  };

  const focusOnPart = (partId: string) => {
    if (selectedPartId === partId) {
      resetView();
      return;
    }

    setSelectedPartId(partId);
    setManualDissect(true);

    const card = currentSpec.properties.find((p) => p.id === partId);
    if (card?.focusOffset) {
      const [fx, fy] = card.focusOffset;
      engineState.current.panX = -fx * 1.1;
      engineState.current.panY = -fy * 1.1;
      engineState.current.scale = 1.85;
    }
  };

  const handlePrev = () => {
    resetView();
    if (mode === "2D") {
      setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
    } else {
      setActiveModel((prev) => {
        const idx = modelOrder.indexOf(prev);
        return modelOrder[(idx - 1 + modelOrder.length) % modelOrder.length];
      });
    }
  };

  const handleNext = () => {
    resetView();
    if (mode === "2D") {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    } else {
      setActiveModel((prev) => {
        const idx = modelOrder.indexOf(prev);
        return modelOrder[(idx + 1) % modelOrder.length];
      });
    }
  };

  const showProperties = isDissecting || manualDissect || Boolean(selectedPartId);

  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    rawGlbBlobRef.current = file;
    const url = URL.createObjectURL(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");

    resetView();
    setCustomModelName(cleanTitle);
    setCustomProperties([]);
    setCustomGlbUrl(url);
    setActiveModel("custom");
    setIsBuilderOpen(true);
  };

  // LIBRARY IMPORT FUNCTIONS
  const handleImportCloudModel = (item: CloudGlbAsset) => {
    setIsLibraryOpen(false);
    setDownloadStatus(`Importing "${item.name}"...`);
    resetView();
    setCustomModelName(item.name);
    setCustomCategory(item.category);
    setCustomSummary(item.description);
    setCustomProperties([]);
    setCustomGlbUrl(item.glbUrl);
    setActiveModel("custom");
    setMode("3D");
    setDownloadStatus("");

    // Background mein file fetch kar ke IndexedDB/blob ke liye save karna
    fetch(item.glbUrl)
      .then(r => r.ok ? r.blob() : null)
      .then(b => { if (b) rawGlbBlobRef.current = b; })
      .catch(() => { });
  };

  const handleImportSketchfabModel = async (model: SketchfabSearchResult, token: string) => {
    setIsLibraryOpen(false);
    setDownloadStatus("⚠️ API sends ZIP files. Please download .GLB manually from Sketchfab & Upload Locally!");
    setTimeout(() => setDownloadStatus(""), 5000);
  };

  const applyPresetTemplate = (preset: (typeof TEACHER_PRESETS)[0]) => {
    setCustomModelName(preset.title);
    setCustomCategory(preset.category);
    setCustomSummary(preset.summary);
    setDraftFormula(preset.formula);
    setDraftStats(preset.stats);
    setDraftBullets(preset.bullets);

    setCustomProperties((prev) =>
      prev.map((card, idx) => {
        const pInfo = preset.partNames[idx % preset.partNames.length];
        return {
          ...card,
          name: pInfo.name,
          metric: pInfo.metric,
          description: pInfo.desc,
        };
      })
    );
  };

  const publishCustomLesson = async () => {
    const newCustomSlide: SlideItem = {
      tag: customCategory,
      title: customModelName,
      subtitle: customSummary,
      linkedModel: "custom",
      formula: draftFormula,
      stats: draftStats,
      bullets: draftBullets,
    };

    const updatedSlides = [...slides.filter((s) => s.linkedModel !== "custom"), newCustomSlide];
    setSlides(updatedSlides);
    setSlideIndex(updatedSlides.length - 1);
    setIsBuilderOpen(false);
    setMode("2D");

    if (rawGlbBlobRef.current) {
      await saveCustomLessonToDB({
        glbBlob: rawGlbBlobRef.current,
        modelName: customModelName,
        category: customCategory,
        summary: customSummary,
        formula: draftFormula,
        stats: draftStats,
        bullets: draftBullets,
        properties: customProperties,
      });
      setIsSavedInBrowser(true);
    }
  };

  const askSpatialAI = async (customPrompt?: string) => {
    const q = (customPrompt ?? aiQuestion).trim();
    if (!q || isAiLoading) return;

    stopSpeakingImmediately();
    setAiQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setIsAiLoading(true);

    const contextPayload = {
      question: q,
      active_model: currentSpec.title,
      category: currentSpec.category,
      summary: currentSpec.summary,
      selected_part: activePartCard
        ? `${activePartCard.name} (${activePartCard.metric}): ${activePartCard.description}`
        : "Full 3D Model Overview",
      all_parts: currentSpec.properties.map((p) => `${p.name}: ${p.description}`),
      is_dissected: showProperties,
    };

    try {
      const res = await fetch("http://localhost:8000/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contextPayload),
      });

      if (!res.ok) throw new Error("Backend offline");
      const data = await res.json();
      const reply = data.answer;

      setChatHistory((prev) => [...prev, { role: "ai", text: reply }]);
      speakTextAloud(reply);
    } catch {
      const partContext = activePartCard
        ? `Currently isolated component is ${activePartCard.name} (${activePartCard.metric}) — ${activePartCard.description}`
        : `Primary subsystems include ${currentSpec.properties
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ")}.`;

      const fallbackReply = `Analyzing ${currentSpec.title} (${currentSpec.category}): ${currentSpec.summary} ${partContext}`;
      setChatHistory((prev) => [...prev, { role: "ai", text: fallbackReply }]);
      speakTextAloud(fallbackReply);
    } finally {
      setIsAiLoading(false);
    }
  };

  const startVoiceMic = () => {
    if (typeof window === "undefined") return;
    stopSpeakingImmediately();
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice recognition is supported in Chrome / Edge.");
      return;
    }
    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    setIsListeningMic(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListeningMic(false);
      askSpatialAI(transcript);
    };
    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);
    recognition.start();
  };

  const handleSlideUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadedSlides: SlideItem[] = files.map((file, idx) => ({
      tag: `CUSTOM SLIDE 0${idx + 1}`,
      title: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
      subtitle: "Teacher Uploaded Presentation Visual",
      bullets: [],
      stats: [],
      imageUrl: URL.createObjectURL(file),
    }));

    setSlides(uploadedSlides);
    setSlideIndex(0);
    setMode("2D");
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCinemaMode(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsCinemaMode(false);
        return;
      }
      if (fullscreenContainerRef.current) {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsCinemaMode(true);
      }
    } catch {
      setIsCinemaMode((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        isBuilderOpen ||
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key.toLowerCase() === "f") toggleFullScreen();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main
      ref={fullscreenContainerRef}
      className="relative w-screen h-screen bg-[#04020a] text-white overflow-hidden select-none fixed inset-0 m-0 p-0"
    >
      <input ref={glbInputRef} type="file" accept=".glb,.gltf" onChange={handleGlbUpload} className="hidden" />
      <input ref={slideInputRef} type="file" accept="image/*" multiple onChange={handleSlideUpload} className="hidden" />

      {/* ========================================================= */}
      {/* PERSISTENT THREE.JS TOUCHLESS HOLOGRAM CANVAS             */}
      {/* ========================================================= */}
      <div
        className={`absolute inset-0 z-10 transition-all duration-500 ${isAiOpen && mode === "2D" ? "opacity-30 blur-[2px]" : "opacity-100"
          }`}
      >
        <Canvas camera={{ position: [0, 0, 5.0], fov: 42 }} className="w-full h-full block">
          <color attach="background" args={["#04020a"]} />
          <Stars radius={50} depth={40} count={1400} factor={3} saturation={0} fade speed={0.6} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[6, 6, 6]} intensity={2.2} />
          <pointLight position={[-5, -3, 3]} intensity={1.6} color="#a855f7" />
          <pointLight position={[4, -4, -3]} intensity={1.2} color="#38bdf8" />
          {/* 🌐 PREMIUM SCI-FI HOLODECK GRID */}
          <Grid
            position={[0, -1.8, 0]}
            args={[20, 20]}
            cellSize={0.25}
            cellThickness={1}
            cellColor="#a855f7" 
            sectionSize={1.5}
            sectionThickness={1.5}
            sectionColor="#22d3ee" 
            fadeDistance={8}
            fadeStrength={1.5}
          />
          <Suspense fallback={null}>
            <Environment preset="city" />
          </Suspense>

          <GestureControlledStage
            engineState={engineState}
            activeModel={displayedModel}
            customGlbUrl={customGlbUrl}
            manualDissect={manualDissect}
            selectedPartId={selectedPartId}
            isEmbeddedInSlide={mode === "2D" && !currentSlide.imageUrl}
            onSelectPart={focusOnPart}
            onExtractedCustomSpecs={(extracted: PropertyCard[]) => {
              setCustomProperties((prev) => (prev.length > 0 ? prev : extracted));
            }}
            onGlbError={() => {
              setCustomGlbUrl(null);
              setActiveModel("atom");
            }}
          />
          
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.85}
              mipmapBlur
              intensity={0.6}
            />
          </EffectComposer>

        </Canvas>
      </div>

      {/* ========================================================= */}
      {/* TOP NAVIGATION BAR                                        */}
      {/* ========================================================= */}
      <header className="absolute top-5 inset-x-8 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-[#090514]/90 border border-white/15 px-4 py-2.5 rounded-2xl backdrop-blur-xl shadow-lg">
            <span
              className={`h-2.5 w-2.5 rounded-full animate-pulse ${showProperties ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee]" : "bg-purple-400"
                }`}
            />
            <span className="text-xs font-mono tracking-wider text-purple-200">
              {activeGestureLabel}
            </span>
          </div>

          {isSavedInBrowser && (
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono text-xs backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>LESSON SAVED IN BROWSER</span>
            </div>
          )}

          {downloadStatus && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-mono text-xs backdrop-blur-md">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{downloadStatus}</span>
            </div>
          )}

          <button
            data-magnetic="true"
            onClick={() => setIsLibraryOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 text-xs font-mono uppercase font-bold flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Search 3D Models</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* AI CO-PILOT TRIGGER BUTTON */}
          <button
            data-magnetic="true"
            onClick={() => {
              setIsAiOpen((prev) => {
                if (prev) stopSpeakingImmediately();
                return !prev;
              });
            }}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 data-[air-hover=true]:scale-105 ${isAiOpen
              ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-black border-white shadow-[0_0_30px_rgba(34,211,238,0.6)]"
              : "bg-[#090514]/90 border-purple-400/50 text-purple-200 hover:border-purple-300"
              }`}
          >
            <SparklesIcon className="w-4 h-4" />
            <span>{isAiOpen ? "Close AI Co-Pilot" : "AI Co-Pilot"}</span>
          </button>

          {customGlbUrl && (
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-mono font-semibold hover:bg-amber-400 hover:text-black transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Lesson</span>
            </button>
          )}

          {mode === "3D" && (
            <button
              data-magnetic="true"
              onClick={() => {
                if (showProperties) {
                  resetView();
                } else {
                  setManualDissect(true);
                }
              }}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 data-[air-hover=true]:scale-105 ${showProperties
                ? "bg-cyan-400 text-black border-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                : "bg-[#090514]/90 border-purple-400/40 text-purple-200"
                }`}
            >
              <Layers className="w-4 h-4" />
              <span>{showProperties ? "Close Dissect" : "Dissect Model"}</span>
            </button>
          )}

          <button
            data-magnetic="true"
            onClick={() => {
              if (mode === "2D" && currentSlide.linkedModel) {
                setActiveModel(currentSlide.linkedModel);
              }
              setMode((m) => (m === "2D" ? "3D" : "2D"));
            }}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 border border-purple-400 text-white text-xs font-mono uppercase tracking-wider font-bold shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black data-[air-hover=true]:border-cyan-200 data-[air-hover=true]:scale-105"
          >
            {mode === "2D" ? "Expand 3D Lab ↗" : "← Keynote Slides"}
          </button>

          {mode === "3D" && (
            <button
              data-magnetic="true"
              onClick={resetView}
              className="p-2.5 rounded-2xl bg-[#090514]/90 border border-white/15 text-white/80 transition-all data-[air-hover=true]:border-purple-400 data-[air-hover=true]:scale-105"
              title="Reset 3D View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            data-magnetic="true"
            onClick={toggleFullScreen}
            className="p-2.5 rounded-2xl bg-[#090514]/90 border border-white/15 text-white/80 transition-all data-[air-hover=true]:border-purple-400 data-[air-hover=true]:scale-105"
            title="Full Screen (F)"
          >
            {isCinemaMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* FLOATING HOLOGRAPHIC AI CO-PILOT DOCK                     */}
      {/* ========================================================= */}
      {isAiOpen && (
        <aside className="absolute top-20 left-8 bottom-20 z-40 w-[440px] rounded-[28px] bg-[#070412]/95 border border-purple-500/50 shadow-[0_25px_90px_rgba(0,0,0,0.95),0_0_60px_rgba(139,92,246,0.3)] backdrop-blur-2xl flex flex-col justify-between overflow-hidden pointer-events-auto">
          <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-fuchsia-500" />

          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600/40 to-cyan-500/30 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                <Bot className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate">
                    SPATIAL AI CO-PILOT
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono text-emerald-300 shrink-0">
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-purple-300/80 mt-0.5">
                  <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate capitalize">{currentSpec.title}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isSpeakingNow && (
                <button
                  data-magnetic="true"
                  onClick={stopSpeakingImmediately}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/25 border border-rose-400 text-rose-200 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse whitespace-nowrap data-[air-hover=true]:bg-rose-500 data-[air-hover=true]:text-white"
                  title="Stop Speaking"
                >
                  <Square className="w-2.5 h-2.5 fill-current" />
                  <span>Stop</span>
                </button>
              )}

              <button
                data-magnetic="true"
                onClick={toggleVoiceMute}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all data-[air-hover=true]:scale-105 ${voiceReadout
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                  : "bg-rose-500/20 border-rose-400/40 text-rose-300"
                  }`}
              >
                {voiceReadout ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{voiceReadout ? "Audio ON" : "Muted"}</span>
              </button>

              <button
                data-magnetic="true"
                onClick={() => {
                  stopSpeakingImmediately();
                  setIsAiOpen(false);
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 scroll-smooth"
          >
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${msg.role === "user"
                    ? "bg-purple-600/30 border-purple-400/50 text-purple-200"
                    : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                    }`}
                >
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[84%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${msg.role === "user"
                    ? "bg-gradient-to-br from-purple-600/40 to-indigo-900/50 border border-purple-400/40 text-white rounded-tr-sm"
                    : "bg-white/[0.05] border border-white/12 text-white/90 rounded-tl-sm"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-cyan-400/30 text-xs font-mono text-cyan-300 animate-pulse">
                  Synthesizing 3D spatial response...
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-white/[0.02] border-t border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-purple-300/70">
              <SparklesIcon className="w-3 h-3 text-cyan-400" />
              <span>Touchless Quick Prompts (Hover 0.6s or Click)</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                `Explain how ${currentSpec.title} works simply`,
                activePartCard
                  ? `What is the function of ${activePartCard.name}?`
                  : `What happens when we dissect ${currentSpec.title}?`,
                `Ask me a classroom quiz question on ${currentSpec.title}`,
              ].map((qChip, idx) => (
                <button
                  key={idx}
                  data-magnetic="true"
                  onClick={() => askSpatialAI(qChip)}
                  className="w-full text-left px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/25 border border-purple-400/25 hover:border-cyan-400/60 text-xs text-purple-100 transition-all truncate data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black data-[air-hover=true]:font-semibold"
                >
                  {qChip}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-[#05030c] border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/15 focus-within:border-cyan-400/70 rounded-2xl p-1.5 transition-all">
              <button
                data-magnetic="true"
                onClick={startVoiceMic}
                className={`px-3 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${isListeningMic
                  ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_#f43f5e]"
                  : "bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-200 border border-cyan-400/30 data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black"
                  }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isListeningMic ? "Listening" : "Voice"}</span>
              </button>

              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") askSpatialAI();
                }}
                placeholder="Ask a question..."
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none min-w-0"
              />

              <button
                onClick={() => askSpatialAI()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90 text-white shrink-0 transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================= */}
      {/* 2D APPLE-KEYNOTE PRESENTATION OVERLAY                     */}
      {/* ========================================================= */}
      {mode === "2D" && (
        <section
          className={`pointer-events-none absolute inset-x-28 top-20 bottom-24 z-20 flex items-center transition-all duration-500 ${isAiOpen ? "opacity-25 blur-[3px] scale-[0.98]" : "opacity-100 blur-0 scale-100"
            }`}
        >
          {currentSlide.imageUrl ? (
            <div className="w-full h-full rounded-[32px] bg-black/85 border border-white/15 p-8 backdrop-blur-2xl flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-purple-300 px-3.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/30">
                  {currentSlide.tag}
                </span>
                <span className="text-xs font-mono text-white/50">
                  SLIDE 0{slideIndex + 1} / 0{slides.length}
                </span>
              </div>
              <div className="flex-1 my-4 flex items-center justify-center overflow-hidden">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              </div>
              <div className="text-sm font-mono text-white/60 text-center">
                HOVER ON LEFT / RIGHT ARROWS FOR 0.6s TO CHANGE SLIDES HANDS-FREE
              </div>
            </div>
          ) : (
            <div className="w-full h-full grid grid-cols-12 items-center rounded-[36px] border border-purple-500/30 bg-gradient-to-r from-[#080514]/95 via-[#080514]/85 to-transparent backdrop-blur-md p-12 shadow-[0_0_90px_rgba(0,0,0,0.85)] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                />
              </div>

              <div className="col-span-7 space-y-6 pr-8">
                <div className="flex items-center gap-3">
                  <span className="px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 font-mono text-xs tracking-widest uppercase">
                    {currentSlide.tag}
                  </span>
                  {currentSlide.formula && (
                    <span className="px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 font-mono text-xs">
                      {currentSlide.formula}
                    </span>
                  )}
                </div>

                <div>
                  <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.12] capitalize">
                    {currentSlide.title}
                  </h1>
                  <p className="text-lg text-purple-200/75 mt-3 leading-relaxed">
                    {currentSlide.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-1">
                  {currentSlide.stats.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md"
                    >
                      <div className="text-[11px] font-mono uppercase tracking-widest text-purple-300/70">
                        {st.label}
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-1">
                        {st.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3.5 pt-2">
                  {currentSlide.bullets.map((b, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <span className="w-6 h-6 rounded-xl bg-purple-500/25 border border-purple-400/60 text-purple-200 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        0{i + 1}
                      </span>
                      <p className="text-base text-white/90 leading-relaxed">{b}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-5 h-full flex flex-col justify-between items-end pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/75 border border-cyan-400/40 text-cyan-300 font-mono text-xs backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>LIVE 3D HOLOGRAM • SLIDE 0{slideIndex + 1} / 0{slides.length}</span>
                </div>

                <div className="px-5 py-2.5 rounded-2xl bg-black/80 border border-white/15 text-xs font-mono text-white/80 backdrop-blur-md">
                  Make a <span className="text-cyan-300 font-bold">CLOSED FIST</span> to dissect 3D model live on slide
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TOP-LEFT MODEL HEADER CARD (3D MODE ONLY) */}
      {mode === "3D" && !isAiOpen && (
        <div className="pointer-events-none absolute top-22 left-8 z-20 max-w-md bg-[#080514]/85 border border-white/15 p-6 rounded-[28px] backdrop-blur-xl shadow-2xl">
          <div className="text-xs font-mono tracking-widest text-cyan-400 uppercase">
            {currentSpec.category}
          </div>
          <h2 className="text-2xl font-extrabold mt-1 text-white capitalize">{currentSpec.title}</h2>
          <p className="text-xs text-white/70 mt-1.5 leading-relaxed">{currentSpec.summary}</p>
          <div className="mt-4 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-xs font-mono text-purple-200">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>CLOSED FIST = Radial 3D Dissection</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-xs font-mono text-cyan-200">
              <SparklesIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>2-HAND PINCH = Zoom In/Out & Move Position</span>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SCIENTIFIC PROPERTY INSPECTOR DRAWER (3D MODE ONLY) */}
      {mode === "3D" && (
        <aside
          className={`absolute top-22 right-28 z-30 w-96 max-h-[72vh] overflow-y-auto flex flex-col gap-3 transition-all duration-500 pr-1 ${showProperties
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-12 pointer-events-none"
            }`}
        >
          <div className="bg-[#080514]/90 border border-cyan-400/40 px-4 py-2.5 rounded-2xl backdrop-blur-xl flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-300">
              Component Telemetry
            </span>
            {selectedPartId ? (
              <button
                data-magnetic="true"
                onClick={() => resetView()}
                className="text-xs font-mono bg-cyan-400 text-black px-3 py-0.5 rounded-full font-bold"
              >
                Show All Parts
              </button>
            ) : (
              <span className="text-xs font-mono text-cyan-200 font-bold">
                {currentSpec.properties.length} NODES
              </span>
            )}
          </div>

          {currentSpec.properties.map((prop) => {
            const isSelected = selectedPartId === prop.id;

            return (
              <div
                key={prop.id}
                role="button"
                data-magnetic="true"
                onClick={() => focusOnPart(prop.id)}
                className={`cursor-pointer text-left transition-all p-4 rounded-2xl backdrop-blur-xl shadow-2xl border ${isSelected
                  ? "bg-cyan-950/90 border-cyan-400 scale-[1.02] shadow-[0_0_25px_rgba(34,211,238,0.45)]"
                  : "bg-[#080514]/85 border-white/15 hover:border-purple-400/60"
                  } data-[air-hover=true]:border-cyan-300 data-[air-hover=true]:scale-[1.02]`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-black"
                      style={{ backgroundColor: prop.color }}
                    >
                      {isSelected ? "ISOLATED" : prop.code}
                    </span>
                    <h3 className="font-semibold text-sm text-white">{prop.name}</h3>
                  </div>
                </div>

                <div className="text-xs font-mono text-purple-300 mt-1.5">{prop.metric}</div>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">{prop.description}</p>
              </div>
            );
          })}
        </aside>
      )}

      {/* ========================================================= */}
      {/* TEACHER LESSON BUILDER STUDIO MODAL                       */}
      {/* ========================================================= */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0b0718] border border-purple-500/40 shadow-[0_0_80px_rgba(168,85,247,0.3)] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                  TEACHER 3D LESSON CREATOR STUDIO (AUTO-SAVES TO BROWSER)
                </span>
                <h2 className="text-2xl font-bold text-white mt-0.5">
                  Configure Custom 3D Model & Slide Details
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {isSavedInBrowser && (
                  <button
                    type="button"
                    onClick={async () => {
                      await clearCustomLessonFromDB();
                      setIsSavedInBrowser(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-mono"
                  >
                    Clear Saved Storage
                  </button>
                )}
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-purple-300">
                Quick-Fill STEM Template (1-Click Setup):
              </label>
              <div className="flex flex-wrap gap-2.5">
                {TEACHER_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPresetTemplate(preset)}
                    className="px-4 py-2 rounded-xl bg-purple-600/25 border border-purple-400/40 hover:bg-purple-600 text-xs font-medium transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-6 space-y-4">
                <div>
                  <label className="text-xs font-mono text-white/60">Lesson / Model Title</label>
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-white/60">Subject Tag</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs font-mono text-purple-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-white/60">Key Formula / Badge</label>
                    <input
                      type="text"
                      value={draftFormula}
                      onChange={(e) => setDraftFormula(e.target.value)}
                      className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs font-mono text-cyan-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-white/60">Lesson Summary Subtitle</label>
                  <textarea
                    rows={2}
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 p-3 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-white/60">
                    3 Slide Key Lecture Points (Shown on 2D Slide)
                  </label>
                  {draftBullets.map((b, i) => (
                    <input
                      key={i}
                      type="text"
                      value={b}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraftBullets((prev) => prev.map((item, idx) => (idx === i ? val : item)));
                      }}
                      className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  ))}
                </div>
              </div>

              <div className="col-span-6 space-y-3">
                <label className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
                  Auto-Detected 3D Sub-Parts ({customProperties.length} Parts):
                </label>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {customProperties.map((prop, idx) => (
                    <div
                      key={prop.id}
                      className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-black"
                          style={{ backgroundColor: prop.color }}
                        >
                          PART 0{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={prop.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomProperties((prev) =>
                              prev.map((c) => (c.id === prop.id ? { ...c, name: val } : c))
                            );
                          }}
                          className="flex-1 bg-black/50 border border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-white"
                        />
                      </div>
                      <input
                        type="text"
                        value={prop.metric}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomProperties((prev) =>
                            prev.map((c) => (c.id === prop.id ? { ...c, metric: val } : c))
                          );
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-purple-300"
                      />
                      <textarea
                        rows={2}
                        value={prop.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomProperties((prev) =>
                            prev.map((c) => (c.id === prop.id ? { ...c, description: val } : c))
                          );
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white/80"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                data-magnetic="true"
                onClick={() => {
                  setIsBuilderOpen(false);
                  setMode("3D");
                }}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-sm font-medium data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black"
              >
                Just View in 3D Lab
              </button>
              <button
                type="button"
                data-magnetic="true"
                onClick={publishCustomLesson}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 transition-all data-[air-hover=true]:scale-105"
              >
                Save to Browser & Launch Slide →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LEFT / RIGHT EDGE DWELL NAVIGATION PADS                   */}
      {/* ========================================================= */}
      {!isAiOpen && (
        <button
          data-magnetic="true"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-16 h-40 rounded-3xl bg-[#080514]/85 border border-white/15 flex flex-col items-center justify-center gap-1.5 backdrop-blur-xl transition-all data-[air-hover=true]:bg-purple-600 data-[air-hover=true]:border-cyan-300 data-[air-hover=true]:scale-105 data-[air-hover=true]:shadow-[0_0_35px_rgba(168,85,247,0.8)]"
        >
          <ChevronLeft className="w-7 h-7 text-white" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/70">Prev</span>
        </button>
      )}

      <button
        data-magnetic="true"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-16 h-40 rounded-3xl bg-[#080514]/85 border border-white/15 flex flex-col items-center justify-center gap-1.5 backdrop-blur-xl transition-all data-[air-hover=true]:bg-purple-600 data-[air-hover=true]:border-cyan-300 data-[air-hover=true]:scale-105 data-[air-hover=true]:shadow-[0_0_35px_rgba(168,85,247,0.8)]"
      >
        <ChevronRight className="w-7 h-7 text-white" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/70">Next</span>
      </button>

      {/* ========================================================= */}
      {/* BOTTOM DOCK                                               */}
      {/* ========================================================= */}
      <footer className="absolute bottom-5 left-8 z-30 flex items-center gap-3 pointer-events-auto">
        {mode === "3D" ? (
          <div className="flex items-center gap-2 bg-[#080514]/90 border border-white/15 p-2 rounded-2xl backdrop-blur-xl shadow-2xl">
            {(
              [
                { id: "atom", label: "Carbon-12 Atom" },
                { id: "dna", label: "DNA Helix" },
                { id: "earth", label: "NASA Earth" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                data-magnetic="true"
                onClick={() => {
                  resetView();
                  setActiveModel(item.id);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all ${activeModel === item.id
                  ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
                  } data-[air-hover=true]:scale-105 data-[air-hover=true]:border data-[air-hover=true]:border-cyan-300`}
              >
                {item.label}
              </button>
            ))}

            {customGlbUrl && (
              <button
                data-magnetic="true"
                onClick={() => {
                  resetView();
                  setActiveModel("custom");
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all capitalize ${activeModel === "custom"
                  ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
              >
                {customModelName.slice(0, 18)}
              </button>
            )}

            <button
              data-magnetic="true"
              onClick={() => {
                setCustomProperties([]);
                glbInputRef.current?.click();
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .GLB</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#080514]/90 border border-white/15 px-4 py-2 rounded-2xl backdrop-blur-xl shadow-2xl">
            <span className="text-xs font-mono text-white/50">
              SLIDE 0{slideIndex + 1} / 0{slides.length}
            </span>
            <button
              data-magnetic="true"
              onClick={() => {
                setCustomProperties([]);
                glbInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all data-[air-hover=true]:bg-purple-500 data-[air-hover=true]:text-white"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Create 3D Lesson (.GLB)</span>
            </button>
            <button
              data-magnetic="true"
              onClick={() => slideInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all data-[air-hover=true]:bg-cyan-400 data-[air-hover=true]:text-black"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Slides</span>
            </button>
          </div>
        )}
      </footer>

      {/* ========================================================= */}
      {/* BIOMECHANICAL 21-JOINT SKELETON HUD OVERLAY               */}
      {/* ========================================================= */}
      <div
        className={`absolute bottom-5 right-6 z-30 rounded-2xl border border-purple-500/50 overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)] bg-black transition-all duration-300 ${isCinemaMode ? "w-32 opacity-50" : "w-52 opacity-100"
          }`}
      >
        <div className="relative w-full aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100 opacity-75"
          />
          <canvas
            ref={skeletonCanvasRef}
            width={240}
            height={135}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
      </div>

      {/* TOUCHLESS CURSOR WITH RADIAL DWELL PROGRESS RING */}
      <div
        ref={cursorDomRef}
        className="pointer-events-none fixed top-0 left-0 z-50 w-12 h-12 flex items-center justify-center transition-transform duration-75 ease-out"
      >
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="rgba(168, 85, 247, 0.18)"
            stroke="rgba(168, 85, 247, 0.7)"
            strokeWidth="2"
          />
          <circle
            ref={dwellRingRef}
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="113"
            strokeDashoffset="113"
            className="transition-[stroke-dashoffset] duration-75"
          />
        </svg>
        <div className="absolute w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff]" />
      </div>

      {/* 3D LIBRARY MODAL */}
      <ModelLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onImportCloudModel={handleImportCloudModel}
        onImportSketchfabModel={handleImportSketchfabModel}
      />
    </main>
  );
}
