const socket = io();

const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");

let localStream;
let isInitiator = false;

// Get local media before joining the room
async function startMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

// WEBRTC events
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", { candidate: event.candidate });
  }
};

// Signaling
socket.on("joined-room", ({ isInitiator: init }) => {
  isInitiator = init;
});

socket.on("peer-joined", async () => {
  // Only initiator creates the offer when second user joins
  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { offer });
  }
});

socket.on("signal", async (data) => {
  if (data.offer) {
    await pc.setRemoteDescription(data.offer);

    // Make sure local tracks are added before creating answer
    if (!localStream) await startMedia();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { answer });
  }

  if (data.answer) {
    await pc.setRemoteDescription(data.answer);
  }

  if (data.candidate) {
    await pc.addIceCandidate(data.candidate);
  }
});

// Room full
socket.on("room-full", () => alert("Room full (max 2 users)"));

// Join button
document.getElementById("join").onclick = async () => {
  // First, get local media
  await startMedia();

  // Second, join the room
  const room = document.getElementById("room").value;
  if (!room) return alert("Enter a room name");
  socket.emit("join-room", room);
};
