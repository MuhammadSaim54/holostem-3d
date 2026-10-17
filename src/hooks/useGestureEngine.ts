"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

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
}

// 21-Joint Biomechanical Hand Skeleton Connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky & Palm
];

export function useGestureEngine({ smoothing = 0.28 }: UseGestureEngineOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDomRef = useRef<HTMLDivElement | null>(null);
  const dwellRingRef = useRef<SVGCircleElement | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [activeGestureLabel, setActiveGestureLabel] = useState<string>(
    "INITIALIZING TOUCHLESS AI VISION..."
  );
  const [isDissecting, setIsDissecting] = useState(false);

  const engineState = useRef<GestureEngineState>({
    rotationX: 0.2,
    rotationY: -0.4,
    scale: 1,
    panX: 0,
    panY: 0,
    isFist: false,
    isPinching: false,
    justPinched3D: false,
    ndcX: 0,
    ndcY: 0,
    cursorX: 0,
    cursorY: 0,
  });

  const smoothCursor = useRef({ x: 0, y: 0 });
  const prevSinglePinch = useRef<{ x: number; y: number } | null>(null);
  const wasPinchingRef = useRef(false);

  // Dual-Hand Pinch Zoom & Position (Pan) Refs
  const prevDualDistance = useRef<number | null>(null);
  const prevDualMidpoint = useRef<{ x: number; y: number } | null>(null);

  // Magnetic Dwell-Click Refs
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
        // Stable WASM resolver
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (isCancelled) return;

        try {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.4,
          });
        } catch {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.4,
          });
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 60 },
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsReady(true);
          setLabelSafe("TOUCHLESS READY • PINCH ROTATE • 2-HAND PINCH ZOOM/PAN");
          detectLoop();
        }
      } catch (err) {
        console.error("MediaPipe initialization error:", err);
        setLabelSafe("CAMERA / VISION READY");
      }
    }

    function drawBiomechanicalSkeleton(
      landmarksArray: any[][],
      isFistNow: boolean,
      isPinchingNow: boolean
    ) {
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

    function updateMagneticUIHover(screenX: number, screenY: number, isPinchingNow: boolean) {
      const el = document.elementFromPoint(screenX, screenY) as HTMLElement | null;
      const magneticTarget = el?.closest('[data-magnetic="true"]') as HTMLElement | null;

      if (hoveredElementRef.current && hoveredElementRef.current !== magneticTarget) {
        hoveredElementRef.current.removeAttribute("data-air-hover");
        hoveredElementRef.current = null;
        dwellTriggeredRef.current = false;
        if (dwellRingRef.current) {
          dwellRingRef.current.style.strokeDashoffset = "113";
        }
      }

      if (magneticTarget) {
        if (hoveredElementRef.current !== magneticTarget) {
          hoveredElementRef.current = magneticTarget;
          hoverStartTimeRef.current = performance.now();
          dwellTriggeredRef.current = false;
          magneticTarget.setAttribute("data-air-hover", "true");
        }

        const elapsed = performance.now() - hoverStartTimeRef.current;
        const dwellDuration = 600;
        const progress = Math.min(1, elapsed / dwellDuration);

        if (dwellRingRef.current) {
          dwellRingRef.current.style.strokeDashoffset = `${113 * (1 - progress)}`;
        }

        if ((progress >= 1 || isPinchingNow) && !dwellTriggeredRef.current) {
          dwellTriggeredRef.current = true;
          magneticTarget.click();
          if (dwellRingRef.current) {
            dwellRingRef.current.style.strokeDashoffset = "113";
          }
        }
        return true;
      } else {
        if (dwellRingRef.current) {
          dwellRingRef.current.style.strokeDashoffset = "113";
        }
        return false;
      }
    }

    const isHandFist = (hand: any[]) => {
      const wrist = hand[0];
      const tips = [8, 12, 16, 20];
      const mcps = [5, 9, 13, 17];
      let curled = 0;
      for (let i = 0; i < 4; i++) {
        const distTip = Math.hypot(hand[tips[i]].x - wrist.x, hand[tips[i]].y - wrist.y);
        const distMcp = Math.hypot(hand[mcps[i]].x - wrist.x, hand[mcps[i]].y - wrist.y);
        if (distTip < distMcp * 1.12) curled++;
      }
      return curled >= 3;
    };

    const isHandPinching = (hand: any[]) => {
      const thumbTip = hand[4];
      const indexTip = hand[8];
      return Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) < 0.06;
    };

    let lastVideoTime = -1;

    function detectLoop() {
      if (isCancelled) return;

      const video = videoRef.current;
      if (video && landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hands = result.landmarks || [];

        if (hands.length === 0) {
          drawBiomechanicalSkeleton([], false, false);
          engineState.current.isFist = false;
          engineState.current.isPinching = false;
          prevSinglePinch.current = null;
          prevDualDistance.current = null;
          prevDualMidpoint.current = null;
          setIsDissecting(false);
          setLabelSafe("SHOW HAND TO CONTROL 3D HOLOGRAM");
        } else {
          const hand1 = hands[0];
          const indexTip1 = hand1[8];

          // 1. Smooth Cursor Tracking
          const rawX = (1 - indexTip1.x) * window.innerWidth;
          const rawY = indexTip1.y * window.innerHeight;

          smoothCursor.current.x += (rawX - smoothCursor.current.x) * smoothing;
          smoothCursor.current.y += (rawY - smoothCursor.current.y) * smoothing;

          const curX = smoothCursor.current.x;
          const curY = smoothCursor.current.y;

          engineState.current.cursorX = curX;
          engineState.current.cursorY = curY;
          engineState.current.ndcX = (curX / window.innerWidth) * 2 - 1;
          engineState.current.ndcY = -(curY / window.innerHeight) * 2 + 1;

          if (cursorDomRef.current) {
            cursorDomRef.current.style.transform = `translate3d(${curX - 24}px, ${curY - 24}px, 0)`;
          }

          const fist1 = isHandFist(hand1);
          const pinch1 = !fist1 && isHandPinching(hand1);

          // 2. Check Dual-Hand Pinch for Zoom In/Out + Position Pan (X/Y)
          if (hands.length >= 2) {
            const hand2 = hands[1];
            const fist2 = isHandFist(hand2);
            const pinch2 = !fist2 && isHandPinching(hand2);

            drawBiomechanicalSkeleton(hands, fist1 || fist2, pinch1 || pinch2);

            if (fist1 || fist2) {
              engineState.current.isFist = true;
              setIsDissecting(true);
              prevDualDistance.current = null;
              prevDualMidpoint.current = null;
              setLabelSafe("CLOSED FIST • RADIAL 3D DISSECTION ACTIVE");
            } else if (pinch1 && pinch2) {
              // BOTH HANDS PINCHING -> ZOOM IN/OUT + PAN POSITION!
              engineState.current.isFist = false;
              setIsDissecting(false);

              const p1x = 1 - hand1[8].x;
              const p1y = hand1[8].y;
              const p2x = 1 - hand2[8].x;
              const p2y = hand2[8].y;

              const dist = Math.hypot(p1x - p2x, p1y - p2y);
              const midX = (p1x + p2x) / 2;
              const midY = (p1y + p2y) / 2;

              if (prevDualDistance.current !== null && prevDualMidpoint.current !== null) {
                // Zoom In / Out based on hand distance change
                const deltaDist = dist - prevDualDistance.current;
                engineState.current.scale = Math.min(
                  2.8,
                  Math.max(0.45, engineState.current.scale + deltaDist * 3.2)
                );

                // Pan 3D Position (X/Y) based on midpoint movement
                const deltaMidX = (midX - prevDualMidpoint.current.x) * 4.2;
                const deltaMidY = -(midY - prevDualMidpoint.current.y) * 3.2;

                engineState.current.panX = Math.max(
                  -2.2,
                  Math.min(2.2, engineState.current.panX + deltaMidX)
                );
                engineState.current.panY = Math.max(
                  -1.5,
                  Math.min(1.5, engineState.current.panY + deltaMidY)
                );
              }

              prevDualDistance.current = dist;
              prevDualMidpoint.current = { x: midX, y: midY };
              prevSinglePinch.current = null;
              setLabelSafe("DUAL-HAND PINCH • ZOOMING & MOVING 3D POSITION");
            } else {
              prevDualDistance.current = null;
              prevDualMidpoint.current = null;
              // Fall back to single hand control with hand 1
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
      engineState.current.isFist = fist1;
      engineState.current.isPinching = pinch1;
      setIsDissecting(fist1);

      const isOverButton = updateMagneticUIHover(curX, curY, pinch1);

      if (fist1) {
        prevSinglePinch.current = null;
        setLabelSafe("CLOSED FIST • RADIAL 3D DISSECTION ACTIVE");
      } else if (pinch1 && !isOverButton) {
        if (!wasPinchingRef.current) {
          engineState.current.justPinched3D = true;
        }
        if (prevSinglePinch.current) {
          const dx = (curX - prevSinglePinch.current.x) * 0.011;
          const dy = (curY - prevSinglePinch.current.y) * 0.011;
          engineState.current.rotationY += dx;
          engineState.current.rotationX = Math.max(
            -1.35,
            Math.min(1.35, engineState.current.rotationX + dy)
          );
        }
        prevSinglePinch.current = { x: curX, y: curY };
        setLabelSafe("PINCH DRAG • ROTATING 360° & SELECTING PART");
      } else {
        prevSinglePinch.current = null;
        if (isOverButton) {
          setLabelSafe("HOLD HOVER 0.6s OR PINCH TO CLICK");
        } else {
          setLabelSafe("OPEN HAND • PINCH TO ROTATE • FIST TO DISSECT");
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