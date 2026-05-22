import cv2
import face_recognition

def test_vision():
    # 0 tells OpenCV to use your default laptop webcam
    video_capture = cv2.VideoCapture(0)
    print("Camera warming up... Press 's' to capture your face, or 'q' to quit.")

    while True:
        # Grab a single frame from the live video feed
        ret, frame = video_capture.read()
        if not ret:
            print("Error: Could not read from webcam.")
            break
        
        # Show the live video feed on your screen
        cv2.imshow('EST Meknes - AI Vision Test', frame)

        # Wait for you to press a key
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('s'):  
            print("\nProcessing image...")
            
            # OpenCV uses BGR colors, but the AI needs standard RGB colors
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Step 1: Find where the face is in the image
            face_locations = face_recognition.face_locations(rgb_frame)
            
            if not face_locations:
                print("No face detected! Make sure you are in the frame.")
            else:
                # Step 2: Extract the 128 measurements
                encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                print("\n✅ SUCCESS! Face detected. Here is your 128-point face encoding:")
                print(encodings[0])
                print(f"\nTotal data points: {len(encodings[0])}")
                break
                
        elif key == ord('q'):
            break

    # Shut down the camera properly
    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    test_vision()