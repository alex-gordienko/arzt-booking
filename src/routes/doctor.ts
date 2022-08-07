import { Router } from 'express';
import Joi from 'joi';
import { MongoClient, WithId } from 'mongodb';
import { config } from '../config';
import * as faker from 'faker';
import { IAppointment, IDoctor, IDoctorCreate } from '../intefaces';
import { isSameDay } from 'date-fns';
import { MAX_AVAILABLE_APPOINTMENTS_PER_DAY } from '../config/constants';

const createDoctorSchema = Joi.object<IDoctorCreate>({
  email: Joi.string().required(),
  photo_avatar: Joi.string().required(),
  phone: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
  spec: Joi.string().required()
})

export const routes = (
  mongoClient: MongoClient
): Router => {
  const doctor: Router = Router();

  const doctorDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IDoctor>(config.databases['hospital'].collections['doctor']);
  
  const appointmentsDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IAppointment>(config.databases['hospital'].collections['appointments']);

  doctor.get('/', async (req, res) => {
    const availableDoctors: IDoctor[] = [];
    const searchedDate = req.query.date ? new Date(req.query.date as string) : new Date();

    for (const doctor of (await doctorDatabase.find().toArray())) {
      const appointmentsOfThisDoctor = await appointmentsDatabase.find({ doctorId: doctor.id }).toArray();

      const appointmentsInSelectedDate = appointmentsOfThisDoctor.filter((appointment: WithId<IAppointment>) => {
        return isSameDay(new Date(appointment.date), searchedDate)
      });
      availableDoctors.push({
        ...doctor,
        free: appointmentsInSelectedDate.length < MAX_AVAILABLE_APPOINTMENTS_PER_DAY
      })
    }
    
    res.send({
      doctors: availableDoctors
    })
  });

  doctor.post('/', async (req, res) => {
    const validationResult = createDoctorSchema.validate(req.body);

    if (validationResult.error) {
      res.status(400).send({
        reason: 'Validation Error',
        message: validationResult.error?.details
      })
    }

    const newDoctorData: IDoctor = {
      ...req.body as IDoctorCreate,
      id: faker.datatype.uuid(),
      reg_token: faker.datatype.uuid(),
      free: false,
      appointments_accepted: []
    }
    const newDoctor = await doctorDatabase.insertOne(newDoctorData);
    
    return res.send({
      doctor: newDoctor
    })
  });

  return doctor;
}