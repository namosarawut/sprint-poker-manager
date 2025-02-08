const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

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
    console.log('Client disconnected');
  });
});

server.listen(10000, () => console.log('Server is running on port 10000'));
 