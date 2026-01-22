# P2P Video App

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=flat)](https://p2p-video-app.onrender.com)

A simple **peer-to-peer video conferencing app** for **2 users per room**.

This app uses **WebRTC** for direct P2P video/audio streaming and **Socket.IO** for signaling. Users can enter a room name. If the room doesn’t exist, it will be created. A maximum of 2 users per room is allowed.

---

## 🌐 Live Demo

[Click here to open the app](https://p2p-video-app.onrender.com)

---

## 💡 Features

- Create or join a room by name
- Maximum **2 users per room**
- Real-time **video + audio** streaming
- Peer-to-peer connection → no heavy server-side media processing
- Works on modern browsers with HTTPS

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express, Socket.IO
- **Real-time media:** WebRTC
- **Deployment:** Render (Node.js hosting)

---

## Feature Implementation

### 1. Room Creation & Joining

Rooms are tracked on the server using a `Map`:

```js
const rooms = new Map(); // roomName -> Set(socket.id)

socket.on("join-room", (roomName) => {
  let room = rooms.get(roomName) || new Set();
  if (room.size >= 2) return socket.emit("room-full");
  room.add(socket.id);
  socket.join(roomName);
  socket.roomName = roomName;
  rooms.set(roomName, room);
});
```

### 2. WebRTC P2P Video Connection

Local media capture:

```js
localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
localVideo.srcObject = localStream;
localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
```

### 3. Offer / Answer exchange via Socket.IO:

```js
socket.on("peer-joined", async () => {
  if (isInitiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("signal", { offer });
  }
});

socket.on("signal", async (data) => {
  if (data.offer) {
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { answer });
  }
  if (data.answer) await pc.setRemoteDescription(data.answer);
  if (data.candidate) await pc.addIceCandidate(data.candidate);
});
```

### 4. ICE Candidate Exchange

```js
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("signal", { candidate: event.candidate });
  }
};
```

## Future Improvements
- Screen sharing: Allow users to share their screens in addition to webcam video.
- Room passwords: Add optional password protection for private rooms.
- Reconnect handling: Reconnect users automatically if they lose connection.
- User identities: Show usernames or avatars for each participant.
- Mobile-friendly UI: Improve layout for phones and tablets.
- Multi-user support: Extend beyond 2 users per room with scalable signaling.
