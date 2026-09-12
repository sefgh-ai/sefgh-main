"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export function useVoiceInput() {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Initialize voice recognition
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        toast.error("Voice input failed", { description: event.error });
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleVoiceInput = (onTranscript) => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported", {
        description: "Your browser doesn't support voice recognition",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          onTranscript(transcript);
          toast.success("Voice captured!", { description: transcript });
        };

        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("Listening...", { description: "Speak now" });
      } catch (error) {
        console.error("Error starting recognition:", error);
        toast.error("Failed to start voice input");
      }
    }
  };

  return {
    isRecording,
    handleVoiceInput,
  };
}
