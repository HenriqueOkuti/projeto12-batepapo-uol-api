import cors from 'cors';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';

const SECONDS_15 = 15 * 1000;
const SECONDS_10 = 10 * 1000;

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
      return res.sendStatus(422);
    }
  } catch (error) {
    //Not sure what would cause to arrive here either
    console.log(error);
    res.sendStatus(500);
  }

  const newMessage = {
    to: message.to,
    text: message.text,
    type: message.type,
    from: user,
    time: dayjs().format('HH:mm:ss'),
  };

  console.log(newMessage);

  await db.collection('uol-chatlog').insertOne(newMessage);

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
        chatlog[i].type === 'message' ||
        chatlog[i].from === user
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

server.post('/status', async (req, res) => {
  const user = req.headers.user;
  try {
    const searchUser = await db.collection('uol-users').findOne({ name: user });
    if (!searchUser) {
      return res.sendStatus(404);
    }
  } catch (error) {
    //Wasn't able to arrive here, so i'm unsure which status to send
    console.log(error);
    res.sendStatus(500);
  }

  await db
    .collection('uol-users')
    .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
  res.sendStatus(200);
});

setInterval(handleInactiveUsers, SECONDS_15);

async function handleInactiveUsers() {
  const timeNow = Date.now();
  const timeLimit = timeNow - SECONDS_10;

  try {
    const inactiveUsers = await db
      .collection('uol-users')
      .find({ lastStatus: { $lte: timeLimit } })
      .toArray();
    if (inactiveUsers.length > 0) {
      const logout_messages = [];
      for (let i = 0, len = inactiveUsers.length; i < len; i++) {
        logout_messages.push({
          from: inactiveUsers[i].name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: dayjs().format('HH:mm:ss'),
        });
      }
      await Promise.all([
        db
          .collection('uol-users')
          .deleteMany({ lastStatus: { $lte: timeLimit } }),
        db.collection('uol-chatlog').insertMany(logout_messages),
      ]);
    }
  } catch (error) {
    console.log(error);
  }
}

//BONUS 1: Sanitização de dados

//BONUS 2: DELETE/messages/ID_DA_MENSAGEM

server.delete('/messages/:id', async (req, res) => {
  const user = req.headers.user;
  const id = req.params.id;

  try {
    const searchMessage = await db
      .collection('uol-chatlog')
      .findOne({ _id: new ObjectId(id) });
    if (searchMessage === null) {
      return res.sendStatus(404);
    }
    if (searchMessage.from === user) {
      await db.collection('uol-chatlog').deleteOne({ _id: new ObjectId(id) });
    } else {
      return res.sendStatus(401);
    }
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
  res.sendStatus(200);
});

//BONUS 3: PUT/messages/ID_DA_MENSAGEM

server.listen(5000, () => console.log('Listening on port 5000'));
