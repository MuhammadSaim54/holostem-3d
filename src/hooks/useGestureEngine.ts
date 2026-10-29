"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { playSciFiSound } from "@/utils/audioEngine";

export interface GestureEngineState {
  rotationX: number;
  rotationY: number;
  scale: number;
  panX: number;
  panY: number;
  isFist: boolean;
  isPinching: boolean;
  justPinched3D: boolean;
  ndcX: number;
  ndcY: number;
  cursorX: number;
  cursorY: number;
}

interface UseGestureEngineOptions {
  smoothing?: number;
  isTrackingPaused?: boolean; // 👈 Nayi option add kardi gayi hai
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky & Palm
];

type InteractionMode = 'NONE' | 'UI_HOVER' | 'ROTATE' | 'ZOOM' | 'FIST';

export function useGestureEngine({ smoothing = 0.35, isTrackingPaused = false }: UseGestureEngineOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDomRef = useRef<HTMLDivElement | null>(null);
  const dwellRingRef = useRef<SVGCircleElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeGestureLabel, setActiveGestureLabel] = useState<string>("INITIALIZING TOUCHLESS AI VISION...");
  const [isDissecting, setIsDissecting] = useState(false);

  // 🚀 Track pause state via ref so loop can read it instantly
  const isPausedRef = useRef(isTrackingPaused);
  useEffect(() => {
    isPausedRef.current = isTrackingPaused;
  }, [isTrackingPaused]);

  const engineState = useRef<GestureEngineState>({
    rotationX: 0.2, rotationY: -0.4, scale: 1, panX: 0, panY: 0,
    isFist: false, isPinching: false, justPinched3D: false,
    ndcX: 0, ndcY: 0, cursorX: 0, cursorY: 0,
  });

  const smoothCursor = useRef({ x: 0, y: 0 });
  const prevSinglePinch = useRef<{ x: number; y: number } | null>(null);
  const wasPinchingRef = useRef(false);
  const wasFistRef = useRef(false);

  const prevDualDistance = useRef<number | null>(null);
  const prevDualMidpoint = useRef<{ x: number; y: number } | null>(null);

  const interactionMode = useRef<InteractionMode>('NONE');

  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const hoverStartTimeRef = useRef<number>(0);
  const dwellTriggeredRef = useRef<boolean>(false);
  const lastLabelRef = useRef<string>("");

  const setLabelSafe = (nextLabel: string) => {
    if (lastLabelRef.current !== nextLabel) {
      lastLabelRef.current = nextLabel;
      setActiveGestureLabel(nextLabel);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    let landmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
        if (isCancelled) return;
        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
            runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "CPU" },
            runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
          });
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } } });
        if (isCancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
          setLabelSafe("READY • PINCH TO ROTATE • FIST TO DISSECT");
          detectLoop();
        }
      } catch (err) {
        setLabelSafe("CAMERA ERROR (CHECK PERMISSIONS)");
      }
    }

    function clearUIHover() {
      if (hoveredElementRef.current) {
        hoveredElementRef.current.removeAttribute("data-air-hover");
        hoveredElementRef.current = null;
      }
      dwellTriggeredRef.current = false;
      if (dwellRingRef.current) dwellRingRef.current.style.strokeDashoffset = "113";
    }

    function updateMagneticUIHover(screenX: number, screenY: number) {
      const el = document.elementFromPoint(screenX, screenY) as HTMLElement | null;
      const magneticTarget = el?.closest('[data-magnetic="true"]') as HTMLElement | null;

      if (hoveredElementRef.current && hoveredElementRef.current !== magneticTarget) {
        clearUIHover();
      }

      if (magneticTarget) {
        if (hoveredElementRef.current !== magneticTarget) {
          hoveredElementRef.current = magneticTarget;
          hoverStartTimeRef.current = performance.now();
          dwellTriggeredRef.current = false;
          magneticTarget.setAttribute("data-air-hover", "true");
          playSciFiSound('hover');
        }

        const progress = Math.min(1, (performance.now() - hoverStartTimeRef.current) / 1200);
        if (dwellRingRef.current) dwellRingRef.current.style.strokeDashoffset = `${113 * (1 - progress)}`;

        if (progress >= 1 && !dwellTriggeredRef.current) {
          dwellTriggeredRef.current = true;
          magneticTarget.click();
          playSciFiSound('click');
          if (dwellRingRef.current) dwellRingRef.current.style.strokeDashoffset = "113";
        }
      } else {
        setLabelSafe("OPEN HAND • HOVER UI TO CLICK");
      }
    }

    const isHandFist = (hand: any[]) => {
      const wrist = hand[0];
      const tips = [8, 12, 16, 20];
      const pips = [6, 10, 14, 18];
      let curled = 0;
      for (let i = 0; i < 4; i++) {
        const distTip = Math.hypot(hand[tips[i]].x - wrist.x, hand[tips[i]].y - wrist.y);
        const distPip = Math.hypot(hand[pips[i]].x - wrist.x, hand[pips[i]].y - wrist.y);
        if (distTip < distPip * 0.9) curled++; 
      }
      return curled >= 3;
    };

    const isHandPinching = (hand: any[]) => {
      return Math.hypot(hand[4].x - hand[8].x, hand[4].y - hand[8].y) < 0.05; 
    };

    function drawBiomechanicalSkeleton(landmarksArray: any[][], isFistNow: boolean, isPinchingNow: boolean) {
      const canvas = skeletonCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      landmarksArray.forEach((landmarks) => {
        ctx.strokeStyle = isFistNow ? "#f43f5e" : isPinchingNow ? "#22d3ee" : "#a855f7";
        ctx.lineWidth = 2.2;

        HAND_CONNECTIONS.forEach(([i, j]) => {
          const p1 = landmarks[i];
          const p2 = landmarks[j];
          if (!p1 || !p2) return;
          ctx.beginPath();
          ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
          ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
          ctx.stroke();
        });

        landmarks.forEach((lm, idx) => {
          const x = (1 - lm.x) * canvas.width;
          const y = lm.y * canvas.height;
          const isFingertip = [4, 8, 12, 16, 20].includes(idx);

          ctx.beginPath();
          ctx.arc(x, y, isFingertip ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isFingertip ? "#22d3ee" : "#ffffff";
          ctx.fill();
        });
      });
    }

    let lastVideoTime = -1;

    function detectLoop() {
      if (isCancelled) return;

      // 🛑 AGAR TRACKING PAUSED HAI TOH DETECTION LOOP BILKUL SKIP HO JAYEGI!
      if (isPausedRef.current) {
        clearUIHover();
        animationFrameId = requestAnimationFrame(detectLoop);
        return;
      }

      const video = videoRef.current;
      if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hands = result.landmarks || [];

        if (hands.length === 0) {
          interactionMode.current = 'NONE';
          engineState.current.isFist = false;
          setIsDissecting(false);
          clearUIHover();
          setLabelSafe("SHOW HAND TO CONTROL LAB");
          drawBiomechanicalSkeleton([], false, false);
        } else {
          const indexTip1 = hands[0][8];
          const SENSITIVITY = 1.9;
          let normX = Math.max(0, Math.min(1, 0.5 + (indexTip1.x - 0.5) * SENSITIVITY));
          let normY = Math.max(0, Math.min(1, 0.5 + (indexTip1.y - 0.5) * SENSITIVITY));
          const rawX = (1 - normX) * window.innerWidth;
          const rawY = normY * window.innerHeight;

          smoothCursor.current.x += (rawX - smoothCursor.current.x) * smoothing;
          smoothCursor.current.y += (rawY - smoothCursor.current.y) * smoothing;
          const curX = smoothCursor.current.x;
          const curY = smoothCursor.current.y;

          engineState.current.cursorX = curX;
          engineState.current.cursorY = curY;
          engineState.current.ndcX = (curX / window.innerWidth) * 2 - 1;
          engineState.current.ndcY = -(curY / window.innerHeight) * 2 + 1;

          if (cursorDomRef.current) cursorDomRef.current.style.transform = `translate3d(${curX - 24}px, ${curY - 24}px, 0)`;

          const hand1 = hands[0];
          const fist1 = isHandFist(hand1);
          const pinch1 = !fist1 && isHandPinching(hand1);

          if (hands.length >= 2) {
            const hand2 = hands[1];
            const fist2 = isHandFist(hand2);
            const pinch2 = !fist2 && isHandPinching(hand2);

            drawBiomechanicalSkeleton(hands, fist1 || fist2, pinch1 || pinch2);

            if (fist1 && fist2) {
              interactionMode.current = 'ZOOM';
              engineState.current.isFist = false;
              setIsDissecting(false);
              wasFistRef.current = false;
              clearUIHover();

              const p1 = hand1[9]; 
              const p2 = hand2[9];
              const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
              const midX = (p1.x + p2.x) / 2; 
              const midY = (p1.y + p2.y) / 2;

              if (prevDualDistance.current !== null && prevDualMidpoint.current !== null) {
                engineState.current.scale = Math.min(2.8, Math.max(0.45, engineState.current.scale + (dist - prevDualDistance.current) * 3.5));
                engineState.current.panX = Math.max(-2.2, Math.min(2.2, engineState.current.panX + (midX - prevDualMidpoint.current.x) * 5.5));
                engineState.current.panY = Math.max(-1.5, Math.min(1.5, engineState.current.panY - (midY - prevDualMidpoint.current.y) * 3.5));
              }
              prevDualDistance.current = dist;
              prevDualMidpoint.current = { x: midX, y: midY };
              setLabelSafe("DUAL FISTS • ZOOMING & PANNING");

            } else {
              prevDualDistance.current = null;
              prevDualMidpoint.current = null;
              handleSingleHand(hand1, fist1, pinch1, curX, curY);
            }
          } else {
            prevDualDistance.current = null;
            prevDualMidpoint.current = null;
            drawBiomechanicalSkeleton(hands, fist1, pinch1);
            handleSingleHand(hand1, fist1, pinch1, curX, curY);
          }

          wasPinchingRef.current = pinch1;
        }
      }
      animationFrameId = requestAnimationFrame(detectLoop);
    }

    function handleSingleHand(
      hand1: any[],
      fist1: boolean,
      pinch1: boolean,
      curX: number,
      curY: number
    ) {
      if (fist1) {
        interactionMode.current = 'FIST';
        engineState.current.isFist = true;
        setIsDissecting(true);
        clearUIHover();

        if (!wasFistRef.current) playSciFiSound('engage');
        wasFistRef.current = true;
        setLabelSafe("CLOSED FIST • RADIAL 3D DISSECTION");
      } else {
        engineState.current.isFist = false;
        setIsDissecting(false);
        wasFistRef.current = false;

        if (pinch1) {
          if (interactionMode.current === 'NONE' || interactionMode.current === 'UI_HOVER') {
            const el = document.elementFromPoint(curX, curY) as HTMLElement | null;
            const magneticTarget = el?.closest('[data-magnetic="true"]') as HTMLElement | null;

            if (magneticTarget) {
              interactionMode.current = 'UI_HOVER';
              magneticTarget.click();
              playSciFiSound('click');
              clearUIHover(); 
            } else {
              interactionMode.current = 'ROTATE';
              prevSinglePinch.current = { x: curX, y: curY };
              engineState.current.justPinched3D = true;
            }
          }

          if (interactionMode.current === 'ROTATE' && prevSinglePinch.current) {
            const dx = (curX - prevSinglePinch.current.x) * 0.012;
            const dy = (curY - prevSinglePinch.current.y) * 0.012;
            engineState.current.rotationY += dx;
            engineState.current.rotationX = Math.max(-1.35, Math.min(1.35, engineState.current.rotationX + dy));
            prevSinglePinch.current = { x: curX, y: curY };
            setLabelSafe("PINCH DRAG • ROTATING 360°");
          }
        } else {
          interactionMode.current = 'NONE';
          prevSinglePinch.current = null;
          updateMagneticUIHover(curX, curY);
        }
      }
    }

    initMediaPipe();

    return () => {
      isCancelled = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [smoothing]);

  return {
    videoRef,
    skeletonCanvasRef,
    cursorDomRef,
    dwellRingRef,
    engineState,
    activeGestureLabel,
    isDissecting,
    isReady,
  };
}