import express from 'express';
import { MongoClient } from 'mongodb';
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

    const collectionsDoc = await mongoClient
      .db(config.databases['hospital'].name)
      .listCollections()
      .toArray();

    for (const collection of collectionsDoc) {
      availableCollections.push(collection.name)
    }
    
    res.send({ availableCollections });
  });

  app.use('/doctor', doctor.routes(mongoClient));
  app.use('/patient', patient.routes(mongoClient));
  app.use('/appointments', apointments.routes(mongoClient))
}