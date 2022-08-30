import cors from 'cors';
import express from 'express';

const server = express();
server.use(cors());
server.use(express.json());

server.post('/participants', (req, res) => {});

server.get('/participants', (req, res) => {});

server.post('/messages', (req, res) => {});

server.get('/messages', (req, res) => {});

server.post('/status', (req, res) => {});

server.listen(5000, () => console.log('Listening on port 5000'));
