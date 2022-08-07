import express from 'express';
import { MongoClient } from 'mongodb';
import { config } from '../config';

const logRequestMiddleware = async (
    req: express.Request,
    mongoClient: MongoClient
  ) => {
  const requestLog = {
    method: req.method,
    path: req.path,
    clientAddress: req.socket.remoteAddress || req.headers['x-forwarded-for'] || null,
    query: req.query ?? undefined,
    params: req.params ?? undefined,
    body: req.body,
    reqestDate: new Date()
  };
  await mongoClient
    .db(config.databases['logger'].name)
    .collection(config.databases['logger'].collections['requests'])
    .insertOne(requestLog);
};

export default logRequestMiddleware;