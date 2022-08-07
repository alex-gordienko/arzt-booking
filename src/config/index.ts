type DatabaseConfig = {
  name: string;
  collections: {
    [collName: string]: string;
  }
}

type Config = {
  mongo: {
    username: string;
    password: string;
  }
  databases: {
    [dbName: string]: DatabaseConfig
  }
}

export const config: Config = {
  mongo: {
    username: 'api',
    password: 'qCyfKdlwutgkDevt'
  },
  databases: {
    logger: {
      name: 'logger',
      collections: {
        requests: 'requests',
        notification: 'notification'
      }
    },
    hospital: {
      name: 'hospital',
      collections: {
        user: 'users',
        doctor: 'doctor',
        appointments: 'appointments'
      }
    }
  }
}

export const dbUri = `mongodb+srv://${config.mongo.username}:${config.mongo.password}@cluster0.7c9gkj9.mongodb.net/?retryWrites=true&w=majority`;