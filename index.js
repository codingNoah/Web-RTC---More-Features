const express = require("express");
const { Server } = require("socket.io");

const app = express();

const server = app.listen(3000, () =>
  console.log("server listening on port 3000")
);

var connections = [];
var offers = [];

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5500",
    // origin: "http://127.0.0.1:5500",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.username = socket.handshake.auth.username;
  const index = connections.findIndex(
    (conn) => conn.username === socket.username
  );

  if (index !== -1) {
    connections = [
      ...connections.slice(0, index),
      { id: socket.id, username: socket.username },
      ...connections.slice(index + 1, connections.length),
    ];
  } else {
    connections.push({ id: socket.id, username: socket.username });
  }

  socket.to(socket.id).emit("connection");
  console.log(
    "Connection established....",
    socket.username,
    connections,
    offers.length
  );

  //   offers.forEach((offer) => {
  //     console.log("initial offer sending", socket.id);
  //     socket.to(socket.id).emit("offer", offer.offer);
  //   });

  socket.on("iceCandidateRecieved", (candidate) => {
    // console.log(socket.id);
    // console.log(candidate);
    console.log(offers[0].iceCandidates);
    var newOffers = offers;
    offers.forEach((offer, index) => {
      if (offer.username === socket.username) {
        newOffers = [
          ...offers.slice(0, index),
          { ...offer, iceCandidates: [...offer.iceCandidates, candidate] },
          ...offers.slice(index + 1, offer.length),
        ];
        // offer.iceCandidates.push(candidate);
      }
    });
    offers = newOffers;
    console.log(offers[0].iceCandidates);

    console.log("iceCandidateRecieved", socket.username);
    // console.log(offers);

    socket.broadcast.emit("iceCandidateSent", candidate);
  });

  socket.on("offerSent", (offer) => {
    offers.push({ offer, username: socket.username, iceCandidates: [] });

    console.log("sending offer from ", socket.username);

    socket.broadcast.emit("offer", { offer, username: socket.username });
  });

  socket.on("offer rejected", () => {
    offers = [];
    socket.broadcast.emit("offer rejected received");
  });

  socket.on("answerSent", (answer) => {
    console.log("Answer sent from", socket.username);
    console.log(offers[0].iceCandidates);
    offers[0].iceCandidates.forEach((candidate) => {
      io.to(socket.id).emit("iceCandidateSent", candidate);
    });
    socket.broadcast.emit("answer", { answer, username: socket.username });
  });
});
