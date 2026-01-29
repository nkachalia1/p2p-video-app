const socket = io();

const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const status = document.getElementById("status");

const toggleCam = document.getElementById("toggleCam");
const toggleMic = document.getElementById("toggleMic");
const leaveBtn = document.getElementById("leave");

const chatInput = document.getElementById("chatInput");
const messages = document.getElementById("messages");

let localStream;
let pc;
let camOn = true;
let micOn = true;

const pcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

document.getElementById("join").onclick = async () => {
  const room = document.getElementById("room").value;
  if (!room) return;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  socket.emit("join-room", room);
};

socket.on("joined-room", () => {
  status.textContent = "Connected";

  pc = new RTCPeerConnection(pcConfig);

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", event.candidate);
    }
  };
});

// Offer created ONLY when peer joins
socket.on("peer-joined", async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("signal", offer);
});

socket.on("signal", async (data) => {
  if (data.type === "offer") {
    await pc.setRemoteDescription(data);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", answer);
  }
  else if (data.type === "answer") {
    await pc.setRemoteDescription(data);
  }
  else {
    await pc.addIceCandidate(data);
  }
});

// Controls
toggleCam.onclick = () => {
  camOn = !camOn;
  localStream.getVideoTracks()[0].enabled = camOn;
};

toggleMic.onclick = () => {
  micOn = !micOn;
  localStream.getAudioTracks()[0].enabled = micOn;
};

leaveBtn.onclick = () => location.reload();

// Chat
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && chatInput.value.trim()) {
    socket.emit("chat", chatInput.value);
    messages.innerHTML += `<div><strong>You:</strong> ${chatInput.value}</div>`;
    chatInput.value = "";
    messages.scrollTop = messages.scrollHeight;
  }
});

socket.on("chat", (msg) => {
  messages.innerHTML += `<div><strong>Peer:</strong> ${msg}</div>`;
  messages.scrollTop = messages.scrollHeight;
});
