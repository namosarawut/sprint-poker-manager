const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: "*", // อนุญาตให้ทุกโดเมนเชื่อมต่อ
        methods: ["GET", "POST"]
    },
    allowEIO3: true, // รองรับ Flutter Web ที่ใช้ socket.io เวอร์ชันเก่า
    pingTimeout: 60000, // ป้องกันการตัดการเชื่อมต่อ
    pingInterval: 25000
});

// เพิ่ม Route สำหรับตรวจสอบว่า API ทำงาน
app.get("/", (req, res) => {
    res.send("Sprint Poker Manager API is running!");
});

const rooms = {};

// ฟังก์ชันลบผู้ใช้เมื่อ disconnect
const removeUserFromRoom = (socketId) => {
    for (const [roomId, room] of Object.entries(rooms)) {
        const userIndex = room.users.findIndex(u => u.socketId === socketId);
        if (userIndex !== -1) {
            console.log(`User ${room.users[userIndex].userName} disconnected from ${roomId}`);
            room.users.splice(userIndex, 1);
            io.to(roomId).emit('updateRoom', room);
            break;
        }
    }
};

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('createRoom', ({ userName, roomName, links, imgSelect }) => {
        console.log(`createRoom ${userName} ${roomName} ${links} ${imgSelect}`); 
        const joinId = `rm${Math.random().toString(36).substr(2, 9)}`;
        rooms[joinId] = {
            roomName,
            joinId,
            links,
            linkRound: links[0],
            round: 1,
            revealCard: false,
            users: [{
                socketId: socket.id,
                userId: 1,
                userName,
                position: 'host',
                vote: '-',
                imgSelect
            }]
        };
        socket.join(joinId);
        socket.emit('roomCreated', rooms[joinId]);
    });

    socket.on('joinRoom', ({ joinId, name, imgSelect }) => {
        const room = rooms[joinId];
        if (room) {
            const userId = room.users.length + 1;
            const newUser = {
                socketId: socket.id,
                userId,
                userName: name,
                position: 'joiner',
                vote: '-',
                imgSelect
            };
            room.users.push(newUser);
            socket.join(joinId);

            console.log(room.users);
            io.to(joinId).emit('updateRoom', room);
        }
    });

    socket.on('vote', ({ joinId, userId, vote }) => {
        const room = rooms[joinId];
        if (room) {
            const user = room.users.find(u => u.userId === userId);
            if (user) {
                user.vote = vote;
                io.to(joinId).emit('updateRoom', room);
            }
        }
    });

    socket.on('revealCards', ({ joinId }) => {
        const room = rooms[joinId];
        if (room) {
            room.revealCard = true;
            io.to(joinId).emit('updateRoom', room);
        }
    });

    socket.on('nextRound', ({ joinId, nextRoundLink }) => {
        const room = rooms[joinId];
        if (room) {
            room.round += 1;
            room.linkRound = nextRoundLink;
            room.revealCard = false;
            room.users.forEach(user => user.vote = '-');
            io.to(joinId).emit('updateRoom', room);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        removeUserFromRoom(socket.id);
    });
});

// ใช้ PORT จาก Environment Variable เพื่อรองรับ Render
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
