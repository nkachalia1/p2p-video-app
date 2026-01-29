const socket = io();

const localVideo = document.getElementById("local");
const remoteVideo = document.getElementById("remote");
const status = document.getElementById("status");
const errorMsg = document.getElementById("error");

const toggleCam = document.getElementById("toggleCam");
const toggleMic = document.getElementById("toggleMic");
const leaveBtn = document.getElementById("leave");

const chatInput = document.getElementById("chatInput");
const messages = document.getElementById("messages");

const localName = document.getElementById("localName");
const remoteName = document.getElementById("remoteName");
const localStatus = document.getElementById("localStatus");
const remoteStatus = document.getElementById("remoteStatus");

let localStream;
let pc;
let camOn = true;
let micOn = true;
let username = "";

const pcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

/* JOIN ROOM */
document.getElementById("join").onclick = async () => {
  errorMsg.textContent = "";

  const roomName = document.getElementById("room").value;
  if (!roomName) return;

  username = prompt("Enter your username:");
  if (!username) return;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;
  localName.textContent = username;
  updateLocalStatus();

  socket.emit("join-room", { roomName, username });
};

/* ROOM FULL HANDLER */
socket.on("room-full", () => {
  errorMsg.textContent = "🚫 This room already has 2 users.";
});

/* JOINED ROOM */
socket.on("joined-room", () => {
  status.textContent = "Connected";

  pc = new RTCPeerConnection(pcConfig);

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) socket.emit("signal", event.candidate);
  };
});

/* OFFER CREATED WHEN PEER JOINS */
socket.on("peer-joined", ({ username: peerUsername }) => {
  remoteName.textContent = peerUsername;
  createOffer();
});

/* SIGNAL HANDLER */
socket.on("signal", async (data) => {
  if (data.type === "offer") {
    await pc.setRemoteDescription(data);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", answer);
  } else if (data.type === "answer") {
    await pc.setRemoteDescription(data);
  } else {
    await pc.addIceCandidate(data);
  }
});

/* CAMERA TOGGLE */
toggleCam.onclick = () => {
  camOn = !camOn;
  localStream.getVideoTracks()[0].enabled = camOn;
  toggleCam.textContent = camOn ? "📷 Camera ON" : "📷 Camera OFF";
  toggleCam.className = camOn ? "on" : "off";
  updateLocalStatus();
  socket.emit("status-update", { camOn, micOn });
};

/* MIC TOGGLE */
toggleMic.onclick = () => {
  micOn = !micOn;
  localStream.getAudioTracks()[0].enabled = micOn;
  toggleMic.textContent = micOn ? "🎙️ Mic ON" : "🎙️ Mic OFF";
  toggleMic.className = micOn ? "on" : "off";
  updateLocalStatus();
  socket.emit("status-update", { camOn, micOn });
};

/* UPDATE LOCAL STATUS */
function updateLocalStatus() {
  localStatus.textContent = `${camOn ? "📷" : "❌"} ${micOn ? "🎙️" : "❌"}`;
}

/* UPDATE REMOTE STATUS */
socket.on("status-update", ({ camOn: c, micOn: m }) => {
  remoteStatus.textContent = `${c ? "📷" : "❌"} ${m ? "🎙️" : "❌"}`;
});

/* LEAVE ROOM */
leaveBtn.onclick = () => location.reload();

/* CHAT INPUT */
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && chatInput.value.trim()) {
    socket.emit("chat", chatInput.value);

    messages.innerHTML += `<div><strong>${username}:</strong> ${chatInput.value}</div>`;
    chatInput.value = "";
    messages.scrollTop = messages.scrollHeight;
  }
});

/* CHAT RECEIVED */
socket.on("chat", ({ username: peerName, message }) => {
  messages.innerHTML += `<div><strong>${peerName}:</strong> ${message}</div>`;
  messages.scrollTop = messages.scrollHeight;
});

/* CREATE OFFER HELPER */
async function createOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("signal", offer);
}
