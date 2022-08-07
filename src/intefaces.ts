export interface IAppointment {
  id: string;
  date: Date;
  userId: string;
  doctorId: string;
  active: boolean;
}

export interface IAppointmentCreate
  extends Pick<IAppointment, 'userId' | 'doctorId' | 'date'> { }

export interface IDoctorApproveAppointment {
  doctorId: string;
  appointmentId: string;
  action: 'approve' | 'reject';
}

export interface IDoctor {
  id: string;
  email: string;
  reg_token: string;
  photo_avatar: string;
  phone: string;
  name: string;
  type: string;
  spec: string;
  free: boolean;
  appointments_accepted: string[];
}

export interface IDoctorCreate
  extends Pick<IDoctor, 'email' | 'photo_avatar' | 'phone' | 'name' | 'type' | 'spec'> { }


export interface IPatient {
  id: string;
  email: string;
  reg_token: string;
  photo_avatar: string;
  phone: string;
  name: string;
  type: string;
  appointments: string[];
  notifiedTimes: number;
}

export interface IPatientCreate
  extends Pick<IPatient, 'email' | 'photo_avatar' | 'phone' | 'name' | 'type'> { }

export interface INotification {
  message: string;
}