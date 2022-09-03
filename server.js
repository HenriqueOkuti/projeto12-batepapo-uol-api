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

    //alphabetically sort !Caution: May be too slow with larger databases
    usersDB.sort((a, b) => a.name.localeCompare(b.name));

    res.send(usersDB);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

server.post('/messages', async (req, res) => {
  const message = req.body;
  const user = req.headers.user;

  console.log(message);
  console.log(user);

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
    if (!searchUser) {
      return res.sendStatus(423);
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

server.get('/messages', async (req, res) => {
  const limit = req.query.limit;
  const user = req.headers.user;
  let limitNum = -1;
  let joi_feedback;
  if (limit) {
    const joi_limit = joi.number();
    limitNum = Number(limit);
    joi_feedback = joi_limit.validate(limitNum);
  }
  if (limit && joi_feedback.error) {
    return res.sendStatus(422);
  }
  try {
    let chatlog = await db.collection('uol-chatlog').find().toArray();
    const userChatlog = [];
    //Early exit when arrive at limit if it's not -1 ???
    for (let i = 0, len = chatlog.length; i < len; i++) {
      if (
        chatlog[i].to === 'Todos' ||
        chatlog[i].to === user ||
        chatlog[i].type === 'message'
      ) {
        userChatlog.push(chatlog[i]);
      }
    }
    if (limit) {
      return res.send(userChatlog.splice(-limitNum));
    }
    res.send(userChatlog);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

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
