import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
import bodyParser from 'body-parser';
import { Home } from './routes';
import { dbUri } from './config';
import logRequestMiddleware from './middlewares/logger.middleware';
import { notificationService } from './services/notification';

const app: express.Express = express();
const mongoClient = new MongoClient(dbUri, { serverApi: ServerApiVersion.v1 });

const port = process.env.PORT || 5001;

app.use(bodyParser.json());

mongoClient.connect((err, database) => {
  if (err) {
    return console.error('Something went wrong', err);
  }
  if (!database) {
    return console.error('Database if not loaded', database);
  }

  app.use(async (req, _res, next) => {
    try {
      await logRequestMiddleware(req, database);
      next();
    } catch (err) {
      console.log('Something went')
    }
  })

  Home(app, database);

  notificationService(database);

  app.listen(port, () => {
    console.log(`We are live on port ${port}`)
  });
  
})

