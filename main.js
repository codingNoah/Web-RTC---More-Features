var username;
var localStream;
var remoteStream;

const callBtn = document.getElementById("call");
const muteBtn = document.getElementById("mute");
const videoOffBtn = document.getElementById("video-off");
const declineBtn = document.getElementById("video-off");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const usernameTag = document.getElementById("username");
const shareScreenBtn = document.getElementById("share-screen");
var connection;
var videoSender;
var audioSender;
var offers = [];

let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

const call = async () => {
  await getUserMedia();

  await createPeerConnection();

  try {
    const offer = await connection.createOffer();
    connection.setLocalDescription(offer);

    socket.emit("offerSent", offer);
    console.log("offer sent", offer);
  } catch (error) {
    console.log(error);
  }
};

const answer = async (offer) => {
  await getUserMedia();
  const offersDiv = document.getElementById("offers");

  offersDiv.style.display = "none";
  await createPeerConnection();

  try {
    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer({});
    await connection.setLocalDescription(answer);

    socket.emit("answerSent", answer);
    console.log("answer sent", answer);
  } catch (error) {
    console.log(error);
  }
};

const createPeerConnection = async () => {
  connection = new RTCPeerConnection(peerConfiguration);

  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    console.log("track", track.kind);

    if (track.kind === "video") {
      videoSender = connection.addTrack(track, localStream);
    }

    if (track.kind === "audio") {
      audioSender = connection.addTrack(track, localStream);
    }

    console.log("local track added", track);
  });

  connection.addEventListener("icecandidate", ({ candidate }) => {
    if (candidate) {
      socket.emit("iceCandidateRecieved", { candidate });
      console.log("Local ice candidate received", candidate);
    }
  });

  connection.addEventListener("track", (e) => {
    console.log(e.streams[0]);
    e.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track, remoteStream);
    });
    console.log("remote track added", e);
  });

  console.log("Local connection established....");
};
const getUserMedia = async () => {
  localStream = await navigator.mediaDevices.getUserMedia(
    {
      video: true,
      audio: true,
    },
    (stream) => {
      console.log("stream", stream);
    }
  );

  localVideo.srcObject = localStream;

  console.log("Local media set....");
};

function removeAudio() {
  const audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  if (audioTrack) {
    if (audioTrack.enabled) {
      audioTrack.enabled = false;
      muteBtn.innerHTML = "Unmute";
    } else {
      audioTrack.enabled = true;
      muteBtn.innerHTML = "Mute";
    }
  }
}
function removeVideo() {
  const videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  if (videoTrack) {
    if (videoTrack.enabled) {
      videoTrack.enabled = false;
      videoOffBtn.innerHTML = "Video On";
    } else {
      videoTrack.enabled = true;
      videoOffBtn.innerHTML = "Video Off";
    }
  }
}

const decline = () => {
  const offersDiv = document.getElementById("offers");
  offersDiv.innerHTML = "";
  if (connection) {
    connection.close();
  }

  console.log("Declining");
  socket.emit("offer rejected");
};

const shareScreen = async () => {
  const tempVideoStream = localStream;
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
    },
    audio: false,
  });
  console.log("stream", stream);
  console.log("videoSender", videoSender);
  const tempVideoSender = videoSender;
  videoSender.replaceTrack(stream.getTracks()[0]);
  console.log("videoSender", videoSender);

  const screenTrack = stream.getTracks()[0];
  console.log("screenTrack", screenTrack);
  localVideo.srcObject = stream;

  shareScreenBtn.style.display = "none";
  screenTrack.onended = () => {
    videoSender.replaceTrack(
      tempVideoStream.getTracks().find((track) => track.kind === "video")
    );
    localVideo.srcObject = tempVideoStream;
    console.log("ending...");
  };
};

muteBtn.addEventListener("click", removeAudio);
videoOffBtn.addEventListener("click", removeVideo);
shareScreenBtn.addEventListener("click", shareScreen);
callBtn.addEventListener("click", call);

const getUsername = () => {
  const name = prompt("Enter your username:");

  if (!name) {
    return getUsername();
  }

  username = name;
  usernameTag.textContent += " " + username;
  return;
};

getUsername();

const socket = io("http://localhost:3000", {
  withCredentials: true,
  auth: {
    username,
  },
});

socket.on("iceCandidateSent", ({ candidate }) => {
  console.log("remote ice candidate received", candidate);

  if (connection) {
    connection.addIceCandidate(candidate);
  }
});

socket.on("answer", ({ answer, username }) => {
  console.log("Answer recieved....");
  connection.setRemoteDescription(answer);
});

socket.on("offer rejected received", () => {
  console.log("offer rejected received");
  const offersDiv = document.getElementById("offers");
  offersDiv.innerHTML = "";

  connection.close();
});

socket.on("offer", ({ offer, username }) => {
  console.log("offer received", offer, username);
  offers.push({ offer, username });
  offers.forEach((o) => {
    const offersDiv = document.getElementById("offers");
    const newOfferEl = document.createElement("div");

    const answerBtn = document.createElement("button");
    answerBtn.innerText = `Answer ${username}`;
    answerBtn.addEventListener("click", () => answer(offer));

    const declineBtn = document.createElement("button");
    declineBtn.innerText = `Decline`;
    declineBtn.addEventListener("click", () => decline(offer));

    newOfferEl.appendChild(answerBtn);
    newOfferEl.appendChild(declineBtn);

    offersDiv.appendChild(newOfferEl);
  });
  //   connection.setRemoteDescription(offer);
});
