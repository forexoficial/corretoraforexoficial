import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCw, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

interface CameraCaptureProps {
  orientation: "horizontal" | "vertical";
  onCapture: (file: File) => void;
  onClose: () => void;
  title: string;
  subtitle: string;
}

export const CameraCapture = ({
  orientation,
  onCapture,
  onClose,
  title,
  subtitle,
}: CameraCaptureProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(t("toast_camera_access_error"));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size based on orientation
    if (orientation === "horizontal") {
      canvas.width = 1920;
      canvas.height = 1080;
    } else {
      canvas.width = 1080;
      canvas.height = 1920;
    }

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(imageDataUrl);
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    // Convert data URL to File
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        stopCamera();
        onClose();
      });
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setCapturedImage(null);
  };

  const aspectRatio = orientation === "horizontal" ? "16/9" : "9/16";

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-sm p-4 text-foreground border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-accent"
          >
            <X className="w-6 h-6" />
          </Button>
          <h3 className="font-semibold">{title}</h3>
          <div className="w-10" />
        </div>
        <p className="text-sm text-center text-muted-foreground">{subtitle}</p>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Overlay Guide */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <div
                className="relative border-4 border-border rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  aspectRatio: aspectRatio,
                  maxWidth: orientation === "horizontal" ? "90%" : "70%",
                  maxHeight: orientation === "horizontal" ? "70%" : "90%",
                }}
              >
                {/* Corner decorations */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {/* Center line for alignment */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {orientation === "horizontal" ? (
                    <div className="w-full h-0.5 bg-primary/50" />
                  ) : (
                    <div className="w-0.5 h-full bg-primary/50" />
                  )}
                </div>
              </div>
            </div>

            {/* Darkened overlay outside guide */}
            <div className="absolute inset-0 bg-background/80 pointer-events-none" style={{ clipPath: orientation === "horizontal"
              ? "polygon(0 0, 100% 0, 100% 15%, 95% 15%, 95% 85%, 100% 85%, 100% 100%, 0 100%, 0 85%, 5% 85%, 5% 15%, 0 15%)"
              : "polygon(0 0, 100% 0, 100% 5%, 85% 5%, 85% 95%, 100% 95%, 100% 100%, 0 100%, 0 95%, 15% 95%, 15% 5%, 0 5%)"
            }} />
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-background/95 backdrop-blur-sm p-6 border-t border-border">
        {!capturedImage ? (
          <div className="flex items-center justify-center gap-12">
            <Button
              variant="ghost"
              size="icon"
              onClick={switchCamera}
              className="hover:bg-accent w-12 h-12"
            >
              <RotateCw className="w-6 h-6" />
            </Button>

            <Button
              size="icon"
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full border-4 border-primary-foreground" />
            </Button>

            <div className="w-12" />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              onClick={retakePhoto}
              className="flex-1 max-w-[200px] h-14 text-base"
            >
              <X className="w-5 h-5 mr-2" />
              Tirar novamente
            </Button>

            <Button
              onClick={confirmPhoto}
              className="flex-1 max-w-[200px] h-14 text-base bg-success hover:bg-success/90"
            >
              <Check className="w-5 h-5 mr-2" />
              Confirmar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
