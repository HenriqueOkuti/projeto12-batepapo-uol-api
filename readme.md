# projeto12-Batepapo Uol API

This an API for the Batepapo Uol App, with a mongo database.

## How it Works:

Data persistency is mantained via Mongo, where data is stored using the following formats:

Each user is stored as

```js
{name: 'username', lastStatus: 123}
```

And each message is stored as

```js
{from: 'username', to: 'Todos', text: 'message', type: 'message', time: '20:04:37'}
```

Inactive users are automatically removed based on their last status update, if the user has been offline for more than 10 seconds they are automatically removed from the active users.

### Routes:

> /participants

Used to insert new participants on the chatroom (POST) and fetch list of online users (GET)

> /messages

Used to insert new messages on the chat (POST) and fetch latest messages (GET)

> /status

Used to update the latest status of each user (i.e. is the user still on the chatroom?)
