const production = process.env.NODE_ENV === "production"
const clientUrl = production ? "steamPictionary.xyz" : "http://localhost:1234"

const io = require("socket.io")(3000, {
  cors: {
    origin: clientUrl,
  },
})

const rooms = {}
const WORDS = [
  [
    "CAD",
    "Short form for computer-aided design, a method to digitally create 2D drawings and 3D models of real-world products before their production.",
  ],
  [
    "Client-server network",
    "Network where access to network resources e.g. files, pictures, etc. and overall control of the network is governed by one or many server",
  ],
  [
    "Cache",
    "A type of computer memory that stores frequently used data, etc. so that they can be retrieved quickly",
  ],
  ["Register", "Small amounts of high-speed memory located within the CPU."],
  [
    "Internet Protocol",
    "A system of rules for addressing and routing data on the Internet",
  ],
]

io.on("connection", (socket) => {
  socket.on("join-room", (data) => {
    const user = { id: socket.id, name: data.name, socket: socket }
    let room = rooms[data.roomId]
    if (room == null) {
      room = { users: [], id: data.roomId }
      rooms[data.roomId] = room
    }

    room.users.push(user)
    socket.join(room.id)

    socket.on("ready", () => {
      user.ready = true
      if (room.users.every((u) => u.ready)) {
        wordItem = getRandomEntry(WORDS)
        room.word = wordItem[0]
        room.wordDescription = wordItem[1]
        room.guesser = getRandomEntry(room.users)
        io.to(room.guesser.id).emit(
          "start-drawer",
          room.word,
          room.wordDescription
        )
        room.guesser.socket.to(room.id).emit("start-guesser")
      }
    })

    socket.on("make-guess", (data) => {
      socket.to(room.id).emit("guess", user.name, data.guess)
      if (data.guess.toLowerCase().trim() === room.word.toLowerCase()) {
        io.to(room.id).emit("winner", user.name, room.word)
        room.users.forEach((u) => {
          u.ready = false
        })
      }
    })

    socket.on("draw", (data) => {
      socket.to(room.id).emit("draw-line", data.start, data.end)
    })

    socket.on("disconnect", () => {
      room.users = room.users.filter((u) => u !== user)
    })
  })
})

function getRandomEntry(array) {
  return array[Math.floor(Math.random() * array.length)]
}
