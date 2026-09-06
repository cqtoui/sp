// @ts-nocheck

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { appClient } from "@/api/appClient";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Camera,
  CameraOff,
  AlertTriangle,
  CheckCircle,
  Shield,
  Video,
  Loader2,
  HardHat,
  Glasses,
  Shirt,
} from "lucide-react";

import { toast } from "sonner";

import DetectionGuide from "../components/monitor/DetectionGuide";


const LOGO_URL = "/actvet-ats-logo.png";

const BACKEND_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const BACKEND_SCAN_URL =
  `${BACKEND_BASE_URL}/api/scan`;

const VIOLATION_PENALTY = 2;


const ALL_REQUIRED_GEAR_IDS = [
  "helmet",
  "goggles",
  "safety_vest",
  "gloves",
  "ear_protection",
  "lab_coat",
];


const IGNORED_GEAR_IDS = new Set([
  "steel_toe_boots",
  "respirator",
  "face_shield",
]);


const GEAR_DEFINITIONS = {
  helmet: {
    id: "helmet",
    label: "Helmet",
    icon: HardHat,
  },

  goggles: {
    id: "goggles",
    label: "Goggles",
    icon: Glasses,
  },

  safety_vest: {
    id: "safety_vest",
    label: "Safety Vest",
    icon: Shirt,
  },

  vest: {
    id: "safety_vest",
    label: "Safety Vest",
    icon: Shirt,
  },

  gloves: {
    id: "gloves",
    label: "Gloves",
    icon: Shield,
  },

  ear_protection: {
    id: "ear_protection",
    label: "Ear Protection",
    icon: Shield,
  },

  lab_coat: {
    id: "lab_coat",
    label: "Lab Coat",
    icon: Shirt,
  },
};


const DISPLAY_NAME_MAP = {
  helmet: "Helmet",
  hardhat: "Helmet",
  hard_hat: "Helmet",
  safety_helmet: "Helmet",

  goggles: "Goggles",
  goggle: "Goggles",
  safety_goggles: "Goggles",
  safety_glasses: "Goggles",

  safety_vest: "Safety Vest",
  vest: "Safety Vest",
  reflective_vest: "Safety Vest",

  gloves: "Gloves",
  glove: "Gloves",
  safety_gloves: "Gloves",

  ear_protection: "Ear Protection",
  earprotection: "Ear Protection",
  ear_muff: "Ear Protection",
  ear_muffs: "Ear Protection",
  earmuff: "Ear Protection",
  earmuffs: "Ear Protection",
  ear_plug: "Ear Protection",
  ear_plugs: "Ear Protection",
  earplug: "Ear Protection",
  earplugs: "Ear Protection",
  hearing_protection: "Ear Protection",
  hearingprotection: "Ear Protection",

  lab_coat: "Lab Coat",
  labcoat: "Lab Coat",
  lab_coats: "Lab Coat",
  labcoats: "Lab Coat",
};


function normalizeGearId(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}


function normalizeGearDisplay(value) {
  const normalizedValue =
    normalizeGearId(value);

  return (
    DISPLAY_NAME_MAP[normalizedValue] ||
    String(value || "")
  );
}


function getRequiredGearItems(requiredGearIds) {
  return requiredGearIds.map((gearId) => {
    const normalizedId =
      normalizeGearId(gearId);

    const definition =
      GEAR_DEFINITIONS[normalizedId];

    if (definition) {
      return definition;
    }

    return {
      id: normalizedId,
      label: normalizeGearDisplay(
        normalizedId
      ),
      icon: Shield,
    };
  });
}


function calculateComplianceRate(
  totalViolations
) {
  const normalizedViolations =
    Math.max(
      0,
      Number(totalViolations || 0)
    );

  return Math.max(
    0,
    100 -
      normalizedViolations *
        VIOLATION_PENALTY
  );
}


let audioContext = null;


function getAudioContext() {
  if (!audioContext) {
    try {
      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      audioContext =
        new AudioContextClass();
    } catch (_) {
      return null;
    }
  }

  if (
    audioContext.state ===
    "suspended"
  ) {
    audioContext.resume();
  }

  return audioContext;
}


function playComplianceSound() {
  const context =
    getAudioContext();

  if (!context) {
    return;
  }

  try {
    [
      [0, 880],
      [0.15, 1100],
      [0.3, 1320],
      [0.55, 1760],
    ].forEach(
      ([time, frequency]) => {
        const oscillator =
          context.createOscillator();

        const gain =
          context.createGain();

        oscillator.connect(gain);
        gain.connect(
          context.destination
        );

        oscillator.type = "sine";

        oscillator.frequency.setValueAtTime(
          frequency,
          context.currentTime +
            time
        );

        gain.gain.setValueAtTime(
          0.22,
          context.currentTime +
            time
        );

        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime +
            time +
            0.35
        );

        oscillator.start(
          context.currentTime +
            time
        );

        oscillator.stop(
          context.currentTime +
            time +
            0.38
        );
      }
    );
  } catch (_) {}
}


function playDangerSound() {
  const context =
    getAudioContext();

  if (!context) {
    return;
  }

  try {
    const masterGain =
      context.createGain();

    masterGain.gain.setValueAtTime(
      1,
      context.currentTime
    );

    masterGain.connect(
      context.destination
    );

    for (
      let index = 0;
      index < 10;
      index += 1
    ) {
      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.connect(gain);
      gain.connect(masterGain);

      oscillator.type = "square";

      oscillator.frequency.setValueAtTime(
        index % 2 === 0
          ? 1400
          : 900,
        context.currentTime +
          index * 0.2
      );

      gain.gain.setValueAtTime(
        0.8,
        context.currentTime +
          index * 0.2
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime +
          index * 0.2 +
          0.18
      );

      oscillator.start(
        context.currentTime +
          index * 0.2
      );

      oscillator.stop(
        context.currentTime +
          index * 0.2 +
          0.19
      );
    }
  } catch (_) {}
}


function ScanOverlay({
  scanning,
  scanResult,
  videoRef,
  containerRef,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const displayBoxRef = useRef(null);
  const detectorRef = useRef(null);
  const detectedBoxRef = useRef(null);
  const lastDetectionRef = useRef(0);
  const sampleCanvasRef = useRef(null);
  const previousFrameRef = useRef(null);

  useEffect(() => {
    if ("FaceDetector" in window) {
      try {
        detectorRef.current =
          new window.FaceDetector({
            maxDetectedFaces: 1,
            fastMode: true,
          });
      } catch (_) {}
    }

    sampleCanvasRef.current =
      document.createElement(
        "canvas"
      );

    sampleCanvasRef.current.width =
      96;

    sampleCanvasRef.current.height =
      72;
  }, []);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const lerp = (
      start,
      end,
      amount
    ) =>
      start +
      (end - start) *
        amount;

    const detectFace =
      async (now) => {
        const video =
          videoRef.current;

        if (
          !video ||
          video.readyState < 2
        ) {
          return;
        }

        if (
          now -
            lastDetectionRef.current <
          100
        ) {
          return;
        }

        lastDetectionRef.current =
          now;

        if (detectorRef.current) {
          try {
            const faces =
              await detectorRef.current.detect(
                video
              );

            if (faces.length > 0) {
              const {
                x,
                y,
                width,
                height,
              } =
                faces[0].boundingBox;

              const videoWidth =
                video.videoWidth ||
                video.clientWidth ||
                640;

              const videoHeight =
                video.videoHeight ||
                video.clientHeight ||
                480;

              detectedBoxRef.current =
                {
                  x: Math.max(
                    0,
                    (
                      x -
                      width * 0.15
                    ) /
                      videoWidth
                  ),

                  y: Math.max(
                    0,
                    (
                      y -
                      height * 0.3
                    ) /
                      videoHeight
                  ),

                  w: Math.min(
                    1,
                    (
                      width * 1.3
                    ) /
                      videoWidth
                  ),

                  h: Math.min(
                    1,
                    (
                      height * 2.2
                    ) /
                      videoHeight
                  ),
                };

              return;
            }
          } catch (_) {}
        }

        const sampleCanvas =
          sampleCanvasRef.current;

        if (!sampleCanvas) {
          return;
        }

        const sampleContext =
          sampleCanvas.getContext(
            "2d",
            {
              willReadFrequently:
                true,
            }
          );

        if (!sampleContext) {
          return;
        }

        sampleContext.drawImage(
          video,
          0,
          0,
          96,
          72
        );

        const frame =
          sampleContext.getImageData(
            0,
            0,
            96,
            72
          ).data;

        if (
          !previousFrameRef.current
        ) {
          previousFrameRef.current =
            new Uint8ClampedArray(
              frame
            );

          return;
        }

        let sumX = 0;
        let sumY = 0;
        let count = 0;
        let minX = 96;
        let minY = 72;
        let maxX = 0;
        let maxY = 0;

        const threshold = 60;

        for (
          let y = 0;
          y < 72;
          y += 1
        ) {
          for (
            let x = 0;
            x < 96;
            x += 1
          ) {
            const pixelIndex =
              (y * 96 + x) * 4;

            const difference =
              Math.abs(
                frame[pixelIndex] -
                  previousFrameRef
                    .current[
                    pixelIndex
                  ]
              ) +
              Math.abs(
                frame[
                  pixelIndex + 1
                ] -
                  previousFrameRef
                    .current[
                    pixelIndex + 1
                  ]
              ) +
              Math.abs(
                frame[
                  pixelIndex + 2
                ] -
                  previousFrameRef
                    .current[
                    pixelIndex + 2
                  ]
              );

            if (
              difference >
              threshold
            ) {
              sumX += x;
              sumY += y;
              count += 1;

              if (x < minX) {
                minX = x;
              }

              if (x > maxX) {
                maxX = x;
              }

              if (y < minY) {
                minY = y;
              }

              if (y > maxY) {
                maxY = y;
              }
            }
          }
        }

        previousFrameRef.current.set(
          frame
        );

        if (count < 25) {
          return;
        }

        const centerX =
          sumX / count / 96;

        const centerY =
          sumY / count / 72;

        const boxWidth =
          Math.max(
            0.25,
            (
              maxX -
              minX +
              6
            ) /
              96
          );

        const boxHeight =
          Math.max(
            0.4,
            (
              maxY -
              minY +
              6
            ) /
              72
          );

        detectedBoxRef.current = {
          x: Math.max(
            0,
            Math.min(
              0.7,
              centerX -
                boxWidth / 2
            )
          ),

          y: Math.max(
            0,
            Math.min(
              0.4,
              centerY -
                boxHeight / 2 -
                0.05
            )
          ),

          w: Math.min(
            0.65,
            boxWidth + 0.1
          ),

          h: Math.min(
            0.9,
            boxHeight + 0.25
          ),
        };
      };

    const draw = (timestamp) => {
      const container =
        containerRef.current;

      const video =
        videoRef.current;

      if (!container) {
        animationRef.current =
          requestAnimationFrame(
            draw
          );

        return;
      }

      canvas.width =
        container.clientWidth;

      canvas.height =
        container.clientHeight;

      const width =
        canvas.width;

      const height =
        canvas.height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        animationRef.current =
          requestAnimationFrame(
            draw
          );

        return;
      }

      context.clearRect(
        0,
        0,
        width,
        height
      );

      const videoWidth =
        video?.videoWidth || 4;

      const videoHeight =
        video?.videoHeight || 3;

      const scale =
        Math.max(
          width / videoWidth,
          height / videoHeight
        );

      const displayedWidth =
        videoWidth * scale;

      const displayedHeight =
        videoHeight * scale;

      const offsetX =
        (
          displayedWidth -
          width
        ) / 2;

      const offsetY =
        (
          displayedHeight -
          height
        ) / 2;

      detectFace(timestamp);

      const target =
        detectedBoxRef.current
          ? {
              ...detectedBoxRef.current,
            }
          : {
              x: 0.25,
              y: 0.05,
              w: 0.5,
              h: 0.85,
            };

      if (
        !displayBoxRef.current
      ) {
        displayBoxRef.current = {
          ...target,
        };
      }

      const display =
        displayBoxRef.current;

      display.x = lerp(
        display.x,
        target.x,
        0.18
      );

      display.y = lerp(
        display.y,
        target.y,
        0.18
      );

      display.w = lerp(
        display.w,
        target.w,
        0.18
      );

      display.h = lerp(
        display.h,
        target.h,
        0.18
      );

      const boxX =
        display.x *
          displayedWidth -
        offsetX;

      const boxY =
        display.y *
          displayedHeight -
        offsetY;

      const boxWidth =
        display.w *
        displayedWidth;

      const boxHeight =
        display.h *
        displayedHeight;

      const color = scanResult
        ? scanResult.compliant
          ? "#22c55e"
          : "#ef4444"
        : "#0ea5e9";

      const cornerLength =
        Math.min(
          boxWidth,
          boxHeight
        ) * 0.14;

      context.fillStyle =
        `${color}10`;

      context.fillRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight
      );

      context.strokeStyle =
        color;

      context.lineWidth = 2.5;
      context.shadowColor =
        color;

      context.shadowBlur = 16;

      [
        [
          boxX,
          boxY,
          1,
          1,
        ],

        [
          boxX + boxWidth,
          boxY,
          -1,
          1,
        ],

        [
          boxX,
          boxY + boxHeight,
          1,
          -1,
        ],

        [
          boxX + boxWidth,
          boxY + boxHeight,
          -1,
          -1,
        ],
      ].forEach(
        ([
          cornerX,
          cornerY,
          directionX,
          directionY,
        ]) => {
          context.beginPath();

          context.moveTo(
            cornerX +
              directionX *
                cornerLength,
            cornerY
          );

          context.lineTo(
            cornerX,
            cornerY
          );

          context.lineTo(
            cornerX,
            cornerY +
              directionY *
                cornerLength
          );

          context.stroke();
        }
      );

      if (scanning) {
        const progress =
          (
            timestamp /
            1200
          ) % 1;

        const lineY =
          boxY +
          boxHeight *
            progress;

        const gradient =
          context.createLinearGradient(
            boxX,
            lineY,
            boxX + boxWidth,
            lineY
          );

        gradient.addColorStop(
          0,
          "transparent"
        );

        gradient.addColorStop(
          0.5,
          `${color}bb`
        );

        gradient.addColorStop(
          1,
          "transparent"
        );

        context.beginPath();

        context.strokeStyle =
          gradient;

        context.lineWidth = 1.5;
        context.shadowBlur = 4;

        context.moveTo(
          boxX,
          lineY
        );

        context.lineTo(
          boxX + boxWidth,
          lineY
        );

        context.stroke();
      }

      context.shadowBlur = 0;

      animationRef.current =
        requestAnimationFrame(
          draw
        );
    };

    animationRef.current =
      requestAnimationFrame(draw);

    return () => {
      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    scanning,
    scanResult,
    videoRef,
    containerRef,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 10,
      }}
    />
  );
}


export default function LiveMonitor() {
  const [
    cameraActive,
    setCameraActive,
  ] = useState(false);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    scanResult,
    setScanResult,
  ] = useState(null);

  const [
    selectedEntry,
    setSelectedEntry,
  ] = useState("");

  const [
    uaeTime,
    setUaeTime,
  ] = useState("");

  const videoRef =
    useRef(null);

  const containerRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const queryClient =
    useQueryClient();


  useEffect(() => {
    const updateClock = () => {
      const time =
        new Date().toLocaleTimeString(
          "en-GB",
          {
            timeZone:
              "Asia/Dubai",

            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        );

      const date =
        new Date().toLocaleDateString(
          "en-GB",
          {
            timeZone:
              "Asia/Dubai",

            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );

      setUaeTime(
        `${date} · ${time} UAE`
      );
    };

    updateClock();

    const interval =
      setInterval(
        updateClock,
        1000
      );

    return () =>
      clearInterval(interval);
  }, []);


  const {
    data: workers = [],
  } = useQuery({
    queryKey: ["workers"],

    queryFn: () =>
      appClient.entities.Worker.list(),
  });


  const {
    data: entryPoints = [],
  } = useQuery({
    queryKey: [
      "entryPoints",
    ],

    queryFn: () =>
      appClient.entities.EntryPoint.list(),
  });


  const selectedEntryPoint =
    useMemo(() => {
      return (
        entryPoints.find(
          (entryPoint) =>
            entryPoint.id ===
            selectedEntry
        ) || null
      );
    }, [
      entryPoints,
      selectedEntry,
    ]);


  const currentRequiredGearIds =
    useMemo(() => {
      const configuredGear =
        selectedEntryPoint
          ?.required_gear;

      const source =
        Array.isArray(
          configuredGear
        ) &&
        configuredGear.length >
          0
          ? configuredGear
          : ALL_REQUIRED_GEAR_IDS;

      return [
        ...new Set(
          source
            .map(
              normalizeGearId
            )
            .filter(
              (gearId) =>
                gearId &&
                !IGNORED_GEAR_IDS.has(
                  gearId
                )
            )
        ),
      ];
    }, [selectedEntryPoint]);


  const currentRequiredGearItems =
    useMemo(() => {
      return getRequiredGearItems(
        currentRequiredGearIds
      );
    }, [currentRequiredGearIds]);


  const currentRequiredGearNames =
    useMemo(() => {
      return currentRequiredGearItems.map(
        (item) =>
          item.label
      );
    }, [currentRequiredGearItems]);


  const createIncident =
    useMutation({
      mutationFn: (data) =>
        appClient.entities.Incident.create(
          data
        ),

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "incidents",
          ],
        });

        toast.success(
          "Incident logged successfully"
        );
      },

      onError: (error) => {
        console.error(
          "Incident creation failed:",
          error
        );

        toast.error(
          "The scan completed, but the incident could not be saved."
        );
      },
    });


  const startCamera =
    useCallback(async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  "user",

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },
              },

              audio: false,
            }
          );

        if (videoRef.current) {
          videoRef.current.srcObject =
            stream;

          await videoRef.current.play();
        }

        streamRef.current =
          stream;

        setCameraActive(true);
      } catch (error) {
        console.error(
          "Camera error:",
          error
        );

        toast.error(
          "Could not start camera. Please allow camera permission."
        );
      }
    }, []);


  const stopCamera =
    useCallback(() => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        streamRef.current =
          null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject =
          null;
      }

      setCameraActive(false);
      setScanResult(null);
    }, []);


  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      }
    };
  }, []);


  const wait = (
    milliseconds
  ) =>
    new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          milliseconds
        )
    );


  const buildEmptyScanResult = (
    message
  ) => {
    return {
      worker_identified:
        "Unknown Worker",

      worker_id: "",

      employee_id: "",

      department:
        selectedEntryPoint
          ?.department ||
        "",

      detected_gear: [],

      required_gear:
        currentRequiredGearNames,

      missing_gear:
        currentRequiredGearNames,

      compliant: false,

      confidence: 0,

      notes: message,

      raw_detections: [],

      image_url: "",

      face_recognition_status:
        "Scan failed",

      quality_rejected:
        false,
    };
  };


  const updateWorkerStatistics =
    async (
      matchedWorker,
      result
    ) => {
      if (!matchedWorker) {
        return;
      }

      const previousTotalScans =
        Math.max(
          0,
          Number(
            matchedWorker.total_scans ||
              0
          )
        );

      const previousViolations =
        Math.max(
          0,
          Number(
            matchedWorker.total_violations ||
              0
          )
        );

      const newTotalScans =
        previousTotalScans +
        1;

      const newTotalViolations =
        result.compliant
          ? previousViolations
          : previousViolations +
            1;

      const newComplianceRate =
        calculateComplianceRate(
          newTotalViolations
        );

      await appClient.entities.Worker.update(
        matchedWorker.id,
        {
          total_scans:
            newTotalScans,

          total_violations:
            newTotalViolations,

          compliance_rate:
            newComplianceRate,
        }
      );

      await queryClient.invalidateQueries({
        queryKey: ["workers"],
      });
    };


  const runScan = async () => {
    getAudioContext();

    if (
      !cameraActive ||
      !videoRef.current
    ) {
      toast.error(
        "Start the camera first."
      );

      return;
    }

    if (!selectedEntryPoint) {
      toast.error(
        "Select an entry point before scanning."
      );

      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const video =
        videoRef.current;

      if (
        !video.videoWidth ||
        !video.videoHeight
      ) {
        throw new Error(
          "Camera is not ready yet. Wait one second and scan again."
        );
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        video.videoWidth;

      canvas.height =
        video.videoHeight;

      const context =
        canvas.getContext(
          "2d"
        );

      if (!context) {
        throw new Error(
          "Could not capture camera frame."
        );
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const blob =
        await new Promise(
          (resolve) => {
            canvas.toBlob(
              resolve,
              "image/jpeg",
              0.95
            );
          }
        );

      if (!blob) {
        throw new Error(
          "Could not create scan image."
        );
      }

      const imageFile =
        new File(
          [blob],
          "scan.jpg",
          {
            type:
              "image/jpeg",
          }
        );

      const formData =
        new FormData();

      formData.append(
        "file",
        imageFile
      );

      formData.append(
        "required_gear",
        JSON.stringify(
          currentRequiredGearIds
        )
      );

      const scanPromise =
        fetch(
          BACKEND_SCAN_URL,
          {
            method: "POST",
            body: formData,
          }
        );

      const [response] =
        await Promise.all([
          scanPromise,
          wait(700),
        ]);

      let backendResult = {};

      try {
        backendResult =
          await response.json();
      } catch (_) {
        backendResult = {};
      }

      if (!response.ok) {
        throw new Error(
          backendResult.detail ||
            `Backend scan failed. Status: ${response.status}`
        );
      }

      const backendDetectedGear =
        Array.isArray(
          backendResult.detected_gear
        )
          ? backendResult.detected_gear
          : [];

      const backendRequiredGear =
        Array.isArray(
          backendResult.required_gear
        )
          ? backendResult.required_gear
          : currentRequiredGearNames;

      const backendMissingGear =
        Array.isArray(
          backendResult.missing_gear
        )
          ? backendResult.missing_gear
          : backendRequiredGear.filter(
              (gear) =>
                !backendDetectedGear.includes(
                  gear
                )
            );

      const result = {
        worker_identified:
          backendResult.worker_identified ||
          "Unknown Worker",

        worker_id:
          backendResult.worker_id ||
          "",

        employee_id:
          backendResult.employee_id ||
          "",

        department:
          backendResult.department ||
          selectedEntryPoint
            ?.department ||
          "",

        detected_gear:
          backendDetectedGear,

        required_gear:
          backendRequiredGear,

        missing_gear:
          backendMissingGear,

        compliant:
          Boolean(
            backendResult.compliant
          ),

        confidence:
          Number(
            backendResult.confidence ||
              0
          ),

        notes:
          backendResult.notes ||
          "Scan completed.",

        raw_detections:
          Array.isArray(
            backendResult.raw_detections
          )
            ? backendResult.raw_detections
            : [],

        image_url:
          backendResult.image_url ||
          "",

        face_recognition_status:
          backendResult.face_recognition_status ||
          "",

        face_distance:
          backendResult.face_distance ??
          null,

        quality_rejected:
          Boolean(
            backendResult.quality_rejected
          ),

        image_quality:
          backendResult.image_quality ||
          null,
      };

      setScanResult(result);

      if (
        result.quality_rejected
      ) {
        toast.error(
          result.notes
        );

        return;
      }

      if (result.compliant) {
        playComplianceSound();
      } else if (
        result.missing_gear.length >
        0
      ) {
        playDangerSound();
      }

      const matchedWorker =
        result.worker_id
          ? workers.find(
              (worker) =>
                worker.backend_worker_id ===
                  result.worker_id ||
                worker.id ===
                  result.worker_id
            )
          : workers.find(
              (worker) =>
                String(
                  worker.full_name ||
                    ""
                ).toLowerCase() ===
                String(
                  result.worker_identified ||
                    ""
                ).toLowerCase()
            );

      if (matchedWorker) {
        try {
          await updateWorkerStatistics(
            matchedWorker,
            result
          );
        } catch (error) {
          console.error(
            "Worker statistics update failed:",
            error
          );

          toast.error(
            "The scan completed, but the worker compliance score could not be updated."
          );
        }
      }

      if (selectedEntryPoint) {
        appClient.entities.EntryPoint.update(
          selectedEntryPoint.id,
          {
            scans_today:
              Number(
                selectedEntryPoint.scans_today ||
                  0
              ) + 1,

            violations_today:
              !result.compliant
                ? Number(
                    selectedEntryPoint.violations_today ||
                      0
                  ) + 1
                : Number(
                    selectedEntryPoint.violations_today ||
                      0
                  ),
          }
        )
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: [
                "entryPoints",
              ],
            });
          })
          .catch((error) => {
            console.error(
              "Entry point update failed:",
              error
            );
          });
      }

      if (
        !result.compliant &&
        result.missing_gear.length >
          0
      ) {
        const incidentDate =
          new Date();

        const workerName =
          matchedWorker?.full_name ||
          (
            result.worker_identified &&
            result.worker_identified !==
              ""
              ? result.worker_identified
              : "Unknown Worker"
          );

        createIncident.mutate({
          worker_id:
            matchedWorker?.id ||
            result.worker_id ||
            "",

          worker_name:
            workerName,

          department:
            result.department ||
            matchedWorker?.department ||
            selectedEntryPoint
              ?.department ||
            "",

          missing_gear:
            result.missing_gear,

          detected_gear:
            result.detected_gear,

          required_gear:
            result.required_gear,

          severity:
            result.missing_gear.length >=
            3
              ? "critical"
              : result.missing_gear.length >=
                  2
              ? "high"
              : "medium",

          status: "open",

          entry_point:
            selectedEntryPoint?.name ||
            "Default Entry",

          screenshot_url:
            result.image_url ||
            "",

          notes:
            result.notes ||
            "",

          incident_time:
            incidentDate.toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "Scan failed:",
        error
      );

      const message =
        error?.message ||
        "Scan failed.";

      const result =
        buildEmptyScanResult(
          message
        );

      setScanResult(result);
      playDangerSound();

      toast.error(message);
    } finally {
      setScanning(false);
    }
  };


  return (
    <div className="p-6 lg:p-8 xl:p-10 max-w-[1920px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Live Monitor
            </h1>

            <p className="text-sm text-muted-foreground font-mono">
              {uaeTime ||
                "Loading time..."}
            </p>
          </div>

          <Select
            value={
              selectedEntry
            }
            onValueChange={
              setSelectedEntry
            }
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select entry point" />
            </SelectTrigger>

            <SelectContent>
              {entryPoints.map(
                (entryPoint) => (
                  <SelectItem
                    key={
                      entryPoint.id
                    }
                    value={
                      entryPoint.id
                    }
                  >
                    {entryPoint.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {selectedEntryPoint && (
            <p className="text-xs text-muted-foreground">
              Required gear for this
              entry point:{" "}
              <span className="font-medium">
                {currentRequiredGearItems
                  .map(
                    (item) =>
                      item.label
                  )
                  .join(", ")}
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-border inline-flex items-center justify-center">
          <img
            src={LOGO_URL}
            alt="ACTVET / ATS"
            className="h-12 w-auto object-contain"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Video className="w-5 h-5" />
                Camera Feed
              </CardTitle>

              {cameraActive && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                  <span className="text-xs font-mono text-red-500">
                    REC
                  </span>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0">
              <div
                ref={
                  containerRef
                }
                className="relative aspect-video bg-black"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {cameraActive && (
                  <ScanOverlay
                    scanning={
                      scanning
                    }
                    scanResult={
                      scanResult
                    }
                    videoRef={
                      videoRef
                    }
                    containerRef={
                      containerRef
                    }
                  />
                )}

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-sidebar/95">
                    <CameraOff className="w-12 h-12 text-muted-foreground/30 mb-3" />

                    <p className="text-sm text-muted-foreground/50 font-mono">
                      Camera Offline
                    </p>
                  </div>
                )}

                {scanning && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/75 px-4 py-2 rounded-full z-20">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />

                    <span className="text-xs text-white font-mono">
                      Analyzing gear
                      compliance...
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 flex gap-3">
                {!cameraActive ? (
                  <Button
                    size="lg"
                    onClick={
                      startCamera
                    }
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={
                        stopCamera
                      }
                      variant="outline"
                    >
                      <CameraOff className="w-5 h-5 mr-2" />
                      Stop Camera
                    </Button>

                    <Button
                      size="lg"
                      onClick={
                        runScan
                      }
                      disabled={
                        scanning ||
                        !selectedEntryPoint
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {scanning ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Shield className="w-5 h-5 mr-2" />
                      )}

                      {scanning
                        ? "Scanning..."
                        : "Scan for Gear"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5 h-full">
          <Card className="border shadow-sm flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Scan Results
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1">
              {!scanResult ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />

                  <p className="text-sm text-muted-foreground">
                    Select an entry
                    point, start the
                    camera, and scan.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg border ${
                      scanResult.compliant
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {scanResult.compliant ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}

                      <span className="font-semibold text-sm">
                        {scanResult.compliant
                          ? "COMPLIANT"
                          : "VIOLATION DETECTED"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {
                        scanResult.notes
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Worker Identified
                    </p>

                    <p className="text-sm font-semibold">
                      {
                        scanResult.worker_identified
                      }
                    </p>

                    {scanResult.face_recognition_status && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {
                          scanResult.face_recognition_status
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Gear Status
                    </p>

                    <div className="space-y-1.5">
                      {(
                        scanResult.detected_gear ||
                        []
                      ).map(
                        (gear) => (
                          <div
                            key={`detected-${gear}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />

                            <span>
                              {gear}
                            </span>
                          </div>
                        )
                      )}

                      {(
                        scanResult.missing_gear ||
                        []
                      ).map(
                        (gear) => (
                          <div
                            key={`missing-${gear}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />

                            <span className="text-red-600 font-medium">
                              {gear}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Detection Confidence
                    </p>

                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              scanResult.confidence ||
                                0
                            )
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {scanResult.confidence ||
                        0}
                      %
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Required Gear
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-2.5">
                {currentRequiredGearItems.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    return (
                      <div
                        key={
                          item.id
                        }
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50 text-sm"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />

                        <span>
                          {
                            item.label
                          }
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {!selectedEntryPoint && (
                <p className="text-xs text-muted-foreground mt-3">
                  Select an entry
                  point to begin
                  scanning.
                </p>
              )}
            </CardContent>
          </Card>

          <DetectionGuide />
        </div>
      </div>
    </div>
  );
}