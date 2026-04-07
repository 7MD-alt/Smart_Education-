import { useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";

function ScanAttendance() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [courseId, setCourseId] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  const startCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStarted(true);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;

    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }

    setCameraStarted(false);
    stopAutoScan();
  };

  const captureFrameAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!courseId) {
      setError("Please enter a course ID.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => {
        canvas.toBlob((file) => resolve(file), "image/jpeg");
      });

      if (!blob) {
        setError("Failed to capture frame.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", blob, "frame.jpg");
      formData.append("course_id", courseId);

      const res = await axiosClient.post("attendance/scan/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError("Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const startAutoScan = () => {
    if (!cameraStarted) {
      setError("Start the camera first.");
      return;
    }

    if (isScanning) return;

    setIsScanning(true);
    intervalRef.current = setInterval(() => {
      captureFrameAndScan();
    }, 2000);
  };

  const stopAutoScan = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopAutoScan();
      stopCamera();
    };
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Live Attendance Scan</h2>

      <div style={{ marginBottom: 20 }}>
        <label>Course ID: </label>
        <input
          type="number"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{ marginLeft: 10, padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        {!cameraStarted ? (
          <button onClick={startCamera}>Start Camera</button>
        ) : (
          <button onClick={stopCamera}>Stop Camera</button>
        )}

        <button
          onClick={captureFrameAndScan}
          style={{ marginLeft: 10 }}
          disabled={!cameraStarted || loading}
        >
          {loading ? "Scanning..." : "Scan Now"}
        </button>

        {!isScanning ? (
          <button
            onClick={startAutoScan}
            style={{ marginLeft: 10 }}
            disabled={!cameraStarted}
          >
            Start Auto Scan
          </button>
        ) : (
          <button onClick={stopAutoScan} style={{ marginLeft: 10 }}>
            Stop Auto Scan
          </button>
        )}
      </div>

      {error && (
        <p style={{ color: "red", marginBottom: 20 }}>
          {error}
        </p>
      )}

      <div style={{ marginBottom: 20 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            maxWidth: 700,
            borderRadius: 12,
            border: "1px solid #ccc",
            background: "#000",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {result && (
        <div style={{ marginTop: 30 }}>
          <h3>Results</h3>

          <p>Faces detected: {result.faces_detected ?? 0}</p>
          <p>Recognized: {result.recognized_count ?? 0}</p>

          {result.recognized_students?.length > 0 ? (
            result.recognized_students.map((s) => (
              <div key={s.student_id} style={{ marginBottom: 8 }}>
                {s.full_name} → {s.status_marked}
              </div>
            ))
          ) : (
            <p>No recognized students.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ScanAttendance;
