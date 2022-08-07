import express from 'express';
import { CollectionInfo, MongoClient } from 'mongodb';
import { config } from '../config';
import * as doctor from './doctor';
import * as patient from './patient';
import * as apointments from './apointments';



export const Home = (
  app: express.Express,
  mongoClient: MongoClient
) => {

  app.get('/', async (_req, res) => {

    const availableCollections: string[] = [];

    await (await mongoClient
      .db(config.databases['hospital'].name)
      .listCollections()
      .toArray()
    ).forEach(
      (doc: CollectionInfo | Pick<CollectionInfo, "name" | "type">) =>
        availableCollections.push(doc.name)
    );
    
    res.send({ availableCollections });
  });

  app.use('/doctor', doctor.routes(mongoClient));
  app.use('/patient', patient.routes(mongoClient));
  app.use('/appointments', apointments.routes(mongoClient))
}