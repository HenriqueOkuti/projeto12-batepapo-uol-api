import cors from 'cors';
import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

const server = express();

server.use(cors());
server.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient
  .connect()
  .then(() => (db = mongoClient.db('uol')))
  .catch((error) => console.log(error));

server.post('/participants', async (req, res) => {
  const user = req.body;
  const joi_user = joi.object({
    name: joi.string().required(),
  });
  const joi_feedback = joi_user.validate(user);
  if (joi_feedback.error) {
    return res.sendStatus(422);
  }
  try {
    const searchUser = await db
      .collection('uol-users')
      .findOne({ name: user.name });
    if (searchUser) {
      return res.sendStatus(409);
    }
  } catch (error) {
    //Wasn't able to arrive here, so i'm unsure which status to send
    console.log(error);
    res.sendStatus(500);
  }
  await db.collection('uol-users').insertOne({
    name: user.name,
    lastStatus: Date.now(),
  });

  await db.collection('uol-chatlog').insertOne({
    from: user.name,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: dayjs().format('HH:mm:ss'),
  });

  res.sendStatus(201);
});

server.get('/participants', async (req, res) => {
  //Not fully sure if i'm sending the correct data structure
  try {
    const usersDB = await db.collection('uol-users').find().toArray();
    console.log(usersDB);
    //alphabetically sort !Caution: May be too slow with larger databases
    usersDB.sort((a, b) => a.name.localeCompare(b.name));
    console.log(usersDB);
    res.send(usersDB);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.post('/messages', async (req, res) => {
  const message = req.body;
  const user = req.headers.user;

  const joi_message = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message'),
  });
  const joi_user = joi.string().alphanum().required();

  const joi_feedback_message = joi_message.validate(message);
  const joi_feedback_user = joi_user.validate(user);
  if (joi_feedback_message.error || joi_feedback_user.error) {
    return res.sendStatus(422);
  }
  try {
    const searchUser = await db.collection('uol-users').findOne({ name: user });
    if (searchUser) {
      return res.sendStatus(422);
    }
  } catch (error) {
    //Not sure what would cause to arrive here either
    console.log(error);
    res.sendStatus(500);
  }

  await db.collection('uol-chatlog').insertOne({
    to: message.to,
    text: message.text,
    type: message.type,
    from: user,
    time: dayjs().format('HH:mm:ss'),
  });

  res.sendStatus(201);
});
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
