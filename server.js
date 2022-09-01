import cors from 'cors';
import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

server.use(cors());
server.use(express.json());
dotenv.config();

const server = express();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

server.post('/participants', (req, res) => {});
//  body da request:
//  {name: "João"}
//  MongoDB:
//  {name: 'xxx', lastStatus: Date.now()}
//  {from: 'xxx', to: 'Todos', text: 'entra na sala...', type: 'status', time: 'HH:MM:SS'}

server.get('/participants', (req, res) => {});
//  Retornar a lista de todos os participantes

server.post('/messages', (req, res) => {});
//  body da request:
//  {to: "Maria", text: "oi sumida rs", type: "private_message"}

server.get('/messages', (req, res) => {});
//  query string
//  http://localhost:4000/messages?limit=100 + header: user

server.post('/status', (req, res) => {});

// Participant in Participants
// {name: 'João', lastStatus: 12313123}

// Message in Messages
// {
//  from: 'João',
//  to: 'Todos',
//  text: 'oi galera',
//  type: 'message',
//  time: '20:04:37'
// }
// {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'}

///////
//back-end só deve entregar as mensagens que aquele usuário poderia ver.
//Ou seja, deve entregar todas as mensagens públicas, todas as mensagens privadas enviadas para ele e por ele.
//Para isso, o front envia um head

server.listen(5000, () => console.log('Listening on port 5000'));
