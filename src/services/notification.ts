import { MongoClient, WithId } from "mongodb";
import { config } from "../config";
import { NOTIFICATION_REFRESH_TIME } from "../config/constants";
import { IAppointment, IDoctor, INotification, IPatient } from "../intefaces";
import { differenceInHours, differenceInDays } from 'date-fns';


export const notificationService = (
  mongoClient: MongoClient
) => {
  const appointmentsDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IAppointment>(config.databases['hospital'].collections['appointments']);
  
  const patientDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IPatient>(config.databases['hospital'].collections['user']);
  
  const doctorDatabase = mongoClient
    .db(config.databases['hospital'].name)
    .collection<IDoctor>(config.databases['hospital'].collections['doctor']);
  
  const notification = mongoClient
    .db(config.databases['logger'].name)
    .collection<INotification>(config.databases['logger'].collections['notification']);
  
  const getFutureAppointments = async (userId: string) => {
    const appointments = await appointmentsDatabase.find({ userId, date: { $gt: new Date() } }).toArray();
    return appointments;
  }

  const isAbleToGetNotification = (user: WithId<IPatient>) => {
    return user.notifiedTimes || 0;
  }

  const updateUsersNotification = async (user: WithId<IPatient>) => {
    return patientDatabase.updateOne({ id: user.id }, { $inc: { notifiedTimes: 1 } });
  }
  
  setInterval(async () => {
    console.log('Start to sending notifications');
    const nowDate = new Date();
    const patients = await patientDatabase.find().toArray();

    for (const patient of patients) {
      const isUserNotifiedTimes = isAbleToGetNotification(patient);

      if (isUserNotifiedTimes < 2) {
        const appointments = await getFutureAppointments(patient.id);
        let shouldUpdateCountOfNotifications = false;

        for (const appointment of appointments) {
          const toDoctor = await doctorDatabase.findOne({ id: appointment.doctorId });

          if (differenceInDays(appointment.date, nowDate) === 1 && isUserNotifiedTimes === 0) {
            const message = `${nowDate.toISOString()} | Hello, ${patient.name}! Remember, you have an appointment to ${toDoctor?.name} tomorrow in ${appointment.date.toISOString()}`;
            console.log(message);
            await notification.insertOne({ message });
            shouldUpdateCountOfNotifications = true;
            continue;
          }
          if (differenceInHours(appointment.date, nowDate) === 2 && isUserNotifiedTimes === 1) {
            const message = `${nowDate.toISOString()} | Hello, ${patient.name}! Remember, you have an appointment to ${toDoctor?.name} in 2 hours: ${appointment.date.toISOString()}`;
            console.log(message);
            await notification.insertOne({ message });
            shouldUpdateCountOfNotifications = true;
            continue;
          }
        }
        if (shouldUpdateCountOfNotifications) {
          console.log(`${patient.name} has been notified`);
          await updateUsersNotification(patient);
        }
      } else {
        console.log(`${patient.name} was already notified`);
        continue;
      }

    }

  }, NOTIFICATION_REFRESH_TIME)
}