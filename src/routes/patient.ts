import { Router } from 'express';
import Joi from 'joi';
import { MongoClient, WithId } from 'mongodb';
import { config } from '../config';
import * as faker from 'faker';
import { IPatient, IPatientCreate } from '../intefaces';

const createPatientSchema = Joi.object<IPatientCreate>({
  email: Joi.string().required(),
  photo_avatar: Joi.string().required(),
  phone: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
})

export const routes = (
  mongoClient: MongoClient
): Router => {
  const patient: Router = Router();

  const patientDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IPatient>(config.databases['hospital'].collections['user']);

    patient.get('/', async (_req, res) => {
    const availablePatients: IPatient[] = [];

    (await patientDatabase.find().toArray()).forEach((doc: WithId<IPatient>) => availablePatients.push(doc));
    
    res.send({
      patients: availablePatients
    })
  });

  patient.post('/', async (req, res) => {
    const validationResult = createPatientSchema.validate(req.body);

    if (validationResult.error) {
      res.status(400).send({
        reason: 'Validation Error',
        message: validationResult.error?.details
      })
    }

    const newPatientData: IPatient = {
      ...req.body as IPatientCreate,
      id: faker.datatype.uuid(),
      reg_token: faker.datatype.uuid(),
      notifiedTimes: 0,
      appointments: []
    }
    const newPatient = await patientDatabase.insertOne(newPatientData);
    
    return res.send({
      patient: newPatient
    })
  });

  return patient;
}