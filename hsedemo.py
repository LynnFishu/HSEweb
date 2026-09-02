import os

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
    "rtsp_transport;tcp|stimeout;5000000"
)

from ultralytics import YOLO
import cv2
import paho.mqtt.client as mqtt
import json
from datetime import datetime
import threading
import base64
import time
import subprocess

# Video source: the robot dog's onboard RTSP stream (replaces the old local
# webcam / cv2.VideoCapture(0)). Orin's Wi-Fi joins the dog's own hotspot
# (D100003) for this - nothing is physically attached to the dog. Internet
# for MQTT comes separately via USB phone tethering.
RTSP_URL = "rtsp://192.168.234.1:8554/test"

# Set to True only when running headless (no monitor attached).
# False enables the live fullscreen detection window for demo viewing.
HEADLESS = False

# Path to the PPE weights on the Orin's filesystem - adjust if placed elsewhere.
MODEL_PATH = "/home/orin/Desktop/My Dockers/Model/bestppe.pt"

# MQTT Setup - public broker. The Orin now has real internet via Wi-Fi
# while staying wired to the dog for RTSP, so this is reachable again.
MQTT_BROKER = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC_BASE = "ppe/detection"

# MQTT Client setup
client = mqtt.Client()

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()  # Start MQTT loop in a separate thread
    print(f"Connected to MQTT broker: {MQTT_BROKER}")
except Exception as e:
    print(f"Failed to connect to MQTT broker: {e}")

# Load model
model = YOLO(MODEL_PATH)

# Class names
CLASS_NAMES = [
    'helmet',
    'no-helmet',
    'no-vest',
    'person',
    'vest'
]

# Cooldown per violation class
last_sent = {
    'no-helmet': datetime.min,
    'no-vest': datetime.min
}
COOLDOWN_SECONDS = 10


def send_violation(violation_type, confidence, frame):
    current_time = datetime.now()

    # Cooldown check
    if (current_time - last_sent[violation_type]).total_seconds() < COOLDOWN_SECONDS:
        return

    # Update timestamp
    last_sent[violation_type] = current_time

    # Frame size handling
    frame_height, frame_width = frame.shape[:2]

    max_dimension = 800
    if frame_height > max_dimension or frame_width > max_dimension:
        if frame_height > frame_width:
            new_height = max_dimension
            new_width = int(frame_width * (max_dimension / frame_height))
        else:
            new_width = max_dimension
            new_height = int(frame_height * (max_dimension / frame_width))
        frame = cv2.resize(frame, (new_width, new_height))
        frame_height, frame_width = new_height, new_width

    # Convert to JPEG Base64
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    image_base64 = base64.b64encode(buffer).decode('utf-8')

    # Message payload
    message = {
        "type": violation_type,
        "confidence": float(confidence),
        "timestamp": current_time.isoformat(),
        "frame_size": {
            "height": frame_height,
            "width": frame_width
        },
        "image": image_base64
    }

    # Publish to MQTT
    topic = f"{MQTT_TOPIC_BASE}/{violation_type}"
    try:
        client.publish(topic, json.dumps(message))
        print(f"Sent violation: {violation_type} ({confidence:.2f})")
    except Exception as e:
        print(f"Failed to send MQTT message: {e}")


WINDOW_NAME = "HSE Live Detection"


def get_screen_size():
    """Read the Orin monitor size so the feed can fill it with no grey bars."""
    try:
        out = subprocess.check_output(["xrandr"], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines():
            if "*" in line:
                size = line.strip().split()[0]
                width, height = size.split("x")
                return int(width), int(height)
    except Exception:
        pass
    return 1920, 1080


def fill_screen(frame, screen_w, screen_h):
    """Stretch the whole frame to the monitor. No crop, no grey borders."""
    return cv2.resize(frame, (screen_w, screen_h), interpolation=cv2.INTER_LINEAR)


# ----------------------
# FULLSCREEN WINDOW SETUP
# ----------------------
fullscreen = True
screen_w, screen_h = get_screen_size()
if not HEADLESS:
    print(f"display: {screen_w}x{screen_h}")
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(WINDOW_NAME, screen_w, screen_h)
    cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
# ----------------------


def open_stream(rtsp_url):
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    if hasattr(cv2, "CAP_PROP_HW_ACCELERATION"):
        cap.set(cv2.CAP_PROP_HW_ACCELERATION, cv2.VIDEO_ACCELERATION_NONE)
    if hasattr(cv2, "CAP_PROP_BUFFERSIZE"):
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


def read_latest_frame(cap):
    ret, frame = False, None
    for _ in range(3):
        ret_temp, frame_temp = cap.read()
        if ret_temp:
            ret, frame = ret_temp, frame_temp
        else:
            break
    return ret, frame


# Open the dog's RTSP stream (replaces the old local webcam)
cap = open_stream(RTSP_URL)
if not cap.isOpened():
    print(f"could not open stream: {RTSP_URL}")
print(f"stream opened: {RTSP_URL}")

try:
    while True:

        # Anti-spam: allow only ONE violation send per type per frame
        sent_this_frame = {
            'no-helmet': False,
            'no-vest': False
        }

        ret, frame = read_latest_frame(cap)
        if not ret:
            print("stream interrupted, reconnecting...")
            time.sleep(1)
            cap = open_stream(RTSP_URL)
            continue

        # Run YOLO inference
        results = model(frame)[0]

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = CLASS_NAMES[cls_id]

            # Send MQTT on violations (only once per frame)
            if class_name in ['no-helmet', 'no-vest'] and not sent_this_frame[class_name]:

                # Mark sent so the same class won't send multiple times in same frame
                sent_this_frame[class_name] = True

                violation_frame = frame.copy()
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                color = (0, 0, 255)
                cv2.rectangle(violation_frame, (x1, y1), (x2, y2), color, 2)
                label = f"{class_name} {conf:.2f}"
                cv2.putText(violation_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # Thread for async MQTT send
                threading.Thread(
                    target=send_violation,
                    args=(class_name, conf, violation_frame)
                ).start()

            # Draw detection on display
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            color = (0, 255, 0) if 'no-' not in class_name else (0, 0, 255)
            label = f"{class_name} {conf:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        if not HEADLESS:
            display = fill_screen(frame, screen_w, screen_h)
            cv2.imshow(WINDOW_NAME, display)

            key = cv2.waitKey(1) & 0xFF

            # Toggle fullscreen with 'f'
            if key == ord('f'):
                fullscreen = not fullscreen
                mode = cv2.WINDOW_FULLSCREEN if fullscreen else cv2.WINDOW_NORMAL
                cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_FULLSCREEN, mode)
                if not fullscreen:
                    cv2.resizeWindow(WINDOW_NAME, screen_w, screen_h)

            # ESC exits
            if key == 27:
                break

finally:
    cap.release()
    if not HEADLESS:
        cv2.destroyAllWindows()
    client.loop_stop()
    client.disconnect()

