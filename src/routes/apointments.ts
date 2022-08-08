import { Router } from 'express';
import Joi from 'joi';
import { MongoClient, WithId } from 'mongodb';
import { config } from '../config';
import * as faker from 'faker';
import { isAfter, isSameDay } from 'date-fns';
import { IAppointment, IAppointmentCreate, IDoctor, IDoctorApproveAppointment, IPatient } from '../intefaces';
import { MAX_AVAILABLE_APPOINTMENTS_PER_DAY } from '../config/constants';

const createAppointmentSchema = Joi.object<IAppointmentCreate>({
  userId: Joi.string().required(),
  doctorId: Joi.string().required(),
  date: Joi.string().required()
});

const approveAppointmentSchema = Joi.object({
  doctorId: Joi.string().required(),
  appointmentId: Joi.string().required(),
  action: Joi.string().valid('approve', 'reject')
})

export const routes = (
  mongoClient: MongoClient
): Router => {
  const appointments: Router = Router();

  const appointmentsDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IAppointment>(config.databases['hospital'].collections['appointments']);
  
  const doctorDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IDoctor>(config.databases['hospital'].collections['doctor']);
  
  const patientDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IPatient>(config.databases['hospital'].collections['user']);


    appointments.get('/', async (_req, res) => {
    const appointments: IAppointment[] = [];

      (await appointmentsDatabase.find().toArray()).forEach((doc: WithId<IAppointment>) => {
        appointments.push({
          ...doc,
          active: isAfter(new Date(doc.date), new Date())
        })
      });
    
    res.send({
      appointments
    })
    });
  
    appointments.post('/doctor-action', async (req, res) => {
      const validationResult = approveAppointmentSchema.validate(req.body);
  
      if (validationResult.error) {
        res.status(400).send({
          reason: 'Validation Error',
          message: validationResult.error?.details
        })
      }
  
      const requestAppointment = req.body as IDoctorApproveAppointment;
  
      const doctor = await doctorDatabase
        .findOne({ id: requestAppointment.doctorId });
      
      if (!doctor) {
        return res.status(404).send({
          reason: 'Validation Error',
          message: 'Doctor not found'
        })
      }
  
      const existedAppointment = await appointmentsDatabase.findOne({ id: requestAppointment.appointmentId });

      if (!existedAppointment) {
        return res.status(404).send({
          reason: 'Validation Error',
          message: 'Appointment not found'
        })
      }

      if (doctor.appointments_accepted.includes(existedAppointment.id)) {
        return res.status(400).send({
          reason: 'Invalid',
          message: 'Appointment already accepted'
        })
      }

      const appointmentsOfThisDoctor = await appointmentsDatabase.find({ doctorId: doctor.id }).toArray();

      const appointmentsInSelectedDate = appointmentsOfThisDoctor.filter((appointment: WithId<IAppointment>) => {
        return isSameDay(new Date(appointment.date), new Date(existedAppointment.date)) && doctor.appointments_accepted.includes(appointment.id)
      })

      if (appointmentsInSelectedDate.length >= MAX_AVAILABLE_APPOINTMENTS_PER_DAY) {
        return res.status(400).send({
          reason: 'Validation Error',
          message: 'Too much appointments for this day, doc'
        }) 
      }

      console.log(`${doctor.name} is ${requestAppointment.action} appointment ${existedAppointment.id} on date ${existedAppointment.date}`);
      let response = {
        action: requestAppointment.action,
        appointmentId: existedAppointment.id,
        date: existedAppointment.date,
        result: 'success'
      }

      try {
        if (requestAppointment.action === 'reject') {
          await appointmentsDatabase.deleteOne({ id: existedAppointment.id });
        } else if (requestAppointment.action === 'approve') {
          await patientDatabase.updateOne({ id: existedAppointment.userId }, { $push: { appointments: existedAppointment.id } });
          await doctorDatabase.updateOne({ id: existedAppointment.doctorId }, { $push: { appointments_accepted: existedAppointment.id } });
        }
        return res.status(200).send(response)
      } catch (err) {
        return res.status(400).send({
          ...response,
          result: err
        })
      }
    });

  appointments.post('/', async (req, res) => {
    const validationResult = createAppointmentSchema.validate(req.body);

    if (validationResult.error) {
      res.status(400).send({
        reason: 'Validation Error',
        message: validationResult.error?.details
      })
    }

    const requestAppointment = req.body as IAppointmentCreate;

    const patient = await patientDatabase
      .findOne({ id: requestAppointment.userId });
    
    if (!patient) {
      return res.status(404).send({
        reason: 'Validation Error',
        message: 'User not found'
      })
    }

    const doctor = await doctorDatabase
      .findOne({ id: requestAppointment.doctorId });
    
    if (!doctor) {
      return res.status(404).send({
        reason: 'Validation Error',
        message: 'Doctor not found'
      })
    }

    const appointmentsOfThisDoctor = await appointmentsDatabase.find({ doctorId: doctor.id }).toArray();

    const approvedAppointmentsInSelectedDate = appointmentsOfThisDoctor.filter((appointment: WithId<IAppointment>) => {
      return isSameDay(new Date(appointment.date), new Date(requestAppointment.date)) && doctor.appointments_accepted.includes(appointment.id)
    })

    if (approvedAppointmentsInSelectedDate.length >= MAX_AVAILABLE_APPOINTMENTS_PER_DAY) {
      return res.status(400).send({
        reason: 'Validation Error',
        message: 'Doctor is busy in selected day'
      }) 
    }

    const newAppointmentData: IAppointment = {
      ...requestAppointment,
      id: faker.datatype.uuid(),
      date: new Date(requestAppointment.date),
      active: true
    }
    const newAppointment = await appointmentsDatabase.insertOne(newAppointmentData);
    
    return res.send({newAppointment})
  });

  return appointments;
}