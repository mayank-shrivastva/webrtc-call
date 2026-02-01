const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const incomingDiv = document.getElementById("incoming");

let pc = null;
let localStream = null;
let otherSocketId = null;

/* 🔥 MOBILE-READY ICE CONFIG (STUN + TURN) */
const iceConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

/* ================= RECEIVER AUTO JOIN (ID = 1234) ================= */
// 🔥 FORCE JOIN FOR RECEIVER PAGE
if (document.getElementById("incoming")) {
  socket.emit("join", "1234");
  console.log("✅ Receiver FORCE joined as 1234");
}


/* ================= CREATE PEER ================= */
function createPeer() {
  pc = new RTCPeerConnection(iceConfig);

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
    remoteVideo.play().catch(() => {});
  };

  pc.onicecandidate = e => {
    if (e.candidate && otherSocketId) {
      socket.emit("ice-candidate", {
        to: otherSocketId,
        candidate: e.candidate
      });
    }
  };
}

/* ================= CALLER STARTS CALL ================= */
async function callUser() {
  try {
    createPeer();

    // USER TAP → permission allowed on mobile
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.srcObject = localStream;
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    const receiverId = document.getElementById("receiverId").value;
    console.log("📞 Calling receiver:", receiverId); // MUST be 1234

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("call-user", { to: receiverId, offer });

  } catch (err) {
    alert("Caller camera/mic blocked: " + err.message);
  }
}

/* ================= INCOMING CALL ================= */
/* ❌ NO CAMERA HERE */
socket.on("incoming-call", async ({ from, offer }) => {
  console.log("📞 Incoming call from:", from);

  otherSocketId = from; // ✅ CALLER socket.id
  incomingDiv.classList.remove("hidden");

  createPeer();
  await pc.setRemoteDescription(offer);
});

/* ================= ACCEPT CALL ================= */
async function acceptCall() {
  try {
    incomingDiv.classList.add("hidden");

    // USER TAP → permission popup
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.srcObject = localStream;
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: otherSocketId,
      answer
    });

  } catch (err) {
    alert("Receiver camera/mic blocked: " + err.message);
  }
}

/* ================= ANSWER RECEIVED ================= */
socket.on("call-answered", async answer => {
  if (pc) {
    await pc.setRemoteDescription(answer);
  }
});

/* ================= ICE RECEIVED ================= */
socket.on("ice-candidate", async candidate => {
  try {
    if (candidate && pc) {
      await pc.addIceCandidate(candidate);
    }
  } catch (err) {
    console.log("ICE add error:", err);
  }
});
