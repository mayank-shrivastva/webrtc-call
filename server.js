const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const users = {};

io.on("connection", socket => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("join", userId => {
    users[userId] = socket.id;
    console.log("👤 User joined:", userId, socket.id);
    console.log("📦 Users map:", users);
  });

  socket.on("call-user", ({ to, offer }) => {
    console.log("📞 Call request to:", to);
    console.log("📦 Users map:", users);

    if (!users[to]) {
      console.log("❌ Receiver NOT FOUND:", to);
      return;
    }

    io.to(users[to]).emit("incoming-call", {
      from: socket.id,
      offer
    });

    console.log("✅ Call forwarded to:", to);
  });

  socket.on("answer-call", ({ to, answer }) => {
    console.log("✅ Call answered, sending to:", to);
    io.to(to).emit("call-answered", answer);
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    for (let id in users) {
      if (users[id] === socket.id) {
        delete users[id];
        console.log("❌ User disconnected:", id);
      }
    }
    console.log("📦 Users after disconnect:", users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
